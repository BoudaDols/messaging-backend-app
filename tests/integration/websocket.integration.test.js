const http = require("node:http");
const { io: ioClient } = require("socket.io-client");
const mongoose = require("mongoose");
const { createClient } = require("redis");
const jwt = require("jsonwebtoken");
const app = require("../../app");
const presenceService = require("../../src/services/presenceService");
const { initializeSocket } = require("../../src/socket/index");

const JWT_SECRET = process.env.JWT_SECRET || "test-secret";

let httpServer;
let redisClient;
let serverPort;
let aliceId;
let bobId;
let aliceToken;
let bobToken;

// Génère un token JWT pour un utilisateur
function generateToken(userId, email, displayName) {
	return jwt.sign({ userId, email, displayName }, JWT_SECRET, {
		expiresIn: "1h",
	});
}

// Connecte un client Socket.io
function connectClient(token) {
	return new Promise((resolve, reject) => {
		const socket = ioClient(`http://localhost:${serverPort}`, {
			auth: { token },
			transports: ["websocket"],
			forceNew: true,
		});
		socket.on("connect", () => resolve(socket));
		socket.on("connect_error", reject);
	});
}

beforeAll(async () => {
	// Connexion MongoDB
	const dbUrl =
		process.env.DB_URL || "mongodb://localhost:27017/messaging-platform-test";
	await mongoose.connect(dbUrl);

	// Connexion Redis
	const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
	redisClient = createClient({ url: redisUrl });
	await redisClient.connect();

	const { setRedisClient } = require("../../src/config/redis");
	setRedisClient(redisClient);

	// Créer deux utilisateurs directement en DB
	const User = require("../../src/models/User");
	const alice = await User.create({
		email: "alice@ws.com",
		passwordHash: "hash",
		displayName: "Alice",
	});
	const bob = await User.create({
		email: "bob@ws.com",
		passwordHash: "hash",
		displayName: "Bob",
	});
	aliceId = alice._id.toString();
	bobId = bob._id.toString();
	aliceToken = generateToken(aliceId, "alice@ws.com", "Alice");
	bobToken = generateToken(bobId, "bob@ws.com", "Bob");

	// Lancer le serveur HTTP + Socket.io sur un port aléatoire
	httpServer = http.createServer(app);
	await initializeSocket(httpServer);

	await new Promise((resolve) => {
		httpServer.listen(0, () => {
			serverPort = httpServer.address().port;
			resolve();
		});
	});
});

afterAll(async () => {
	// Annuler tous les timers de présence en attente
	presenceService.clearAllTimers();

	// Attendre un court instant pour que les déconnexions se propagent
	await new Promise((resolve) => setTimeout(resolve, 100));

	const collections = mongoose.connection.collections;
	for (const key in collections) {
		await collections[key].deleteMany({});
	}
	await redisClient.flushDb();
	await mongoose.connection.close();
	await redisClient.quit();

	await new Promise((resolve) => httpServer.close(resolve));
});

describe("WebSocket authentication", () => {
	it("should reject connection without token", (done) => {
		const socket = ioClient(`http://localhost:${serverPort}`, {
			transports: ["websocket"],
			forceNew: true,
		});

		socket.on("connect_error", (err) => {
			expect(err.message).toBeDefined();
			socket.disconnect();
			done();
		});

		socket.on("connect", () => {
			socket.disconnect();
			done(new Error("Should not connect without token"));
		});
	});

	it("should accept connection with valid token", async () => {
		const socket = await connectClient(aliceToken);
		expect(socket.connected).toBe(true);
		socket.disconnect();
	});
});

describe("send_message event", () => {
	let aliceSocket;
	let bobSocket;

	beforeEach(async () => {
		aliceSocket = await connectClient(aliceToken);
		bobSocket = await connectClient(bobToken);
	});

	afterEach(() => {
		aliceSocket.disconnect();
		bobSocket.disconnect();
	});

	it("should acknowledge a sent message", (done) => {
		aliceSocket.emit(
			"send_message",
			{ recipientId: bobId, content: "Hello Bob!" },
			(ack) => {
				expect(ack.success).toBe(true);
				expect(ack.messageId).toBeDefined();
				expect(ack.status).toBe("sent");
				done();
			},
		);
	});

	it("should deliver message to recipient in real time", (done) => {
		bobSocket.on("new_message", (message) => {
			expect(message.content).toBe("Real-time test");
			expect(message.senderId).toBe(aliceId);
			expect(message.recipientId).toBe(bobId);
			done();
		});

		aliceSocket.emit("send_message", {
			recipientId: bobId,
			content: "Real-time test",
		});
	});

	it("should return error for empty content", (done) => {
		aliceSocket.emit(
			"send_message",
			{ recipientId: bobId, content: "" },
			(ack) => {
				expect(ack.success).toBe(false);
				expect(ack.error).toBeDefined();
				done();
			},
		);
	});

	it("should return error for non-existent recipient", (done) => {
		const fakeId = new mongoose.Types.ObjectId().toString();
		aliceSocket.emit(
			"send_message",
			{ recipientId: fakeId, content: "Hello?" },
			(ack) => {
				expect(ack.success).toBe(false);
				done();
			},
		);
	});
});

describe("message_read event", () => {
	let aliceSocket;
	let bobSocket;

	beforeEach(async () => {
		aliceSocket = await connectClient(aliceToken);
		bobSocket = await connectClient(bobToken);
	});

	afterEach(() => {
		aliceSocket.disconnect();
		bobSocket.disconnect();
	});

	it("should notify sender when message is read", (done) => {
		// Alice écoute les accusés de lecture
		aliceSocket.on("read_receipt", (receipt) => {
			expect(receipt.readerId).toBe(bobId);
			expect(receipt.messageIds.length).toBeGreaterThan(0);
			done();
		});

		// Bob reçoit un message puis le marque comme lu
		bobSocket.on("new_message", (message) => {
			bobSocket.emit("message_read", { messageIds: [message._id] });
		});

		// Alice envoie un message
		aliceSocket.emit("send_message", {
			recipientId: bobId,
			content: "Read this please",
		});
	});
});

describe("typing indicators", () => {
	let aliceSocket;
	let bobSocket;
	let conversationId;

	beforeEach(async () => {
		aliceSocket = await connectClient(aliceToken);
		bobSocket = await connectClient(bobToken);

		// Créer une conversation en envoyant un message
		await new Promise((resolve) => {
			aliceSocket.emit(
				"send_message",
				{ recipientId: bobId, content: "Start conversation" },
				(ack) => {
					conversationId = ack.conversationId;
					resolve();
				},
			);
		});
	});

	afterEach(() => {
		aliceSocket.disconnect();
		bobSocket.disconnect();
	});

	it("should broadcast typing_start to the other participant", (done) => {
		bobSocket.on("typing_status", (status) => {
			expect(status.isTyping).toBe(true);
			expect(status.userId).toBe(aliceId);
			done();
		});

		aliceSocket.emit("typing_start", { conversationId });
	});

	it("should broadcast typing_stop to the other participant", (done) => {
		bobSocket.on("typing_status", (status) => {
			if (!status.isTyping) {
				expect(status.userId).toBe(aliceId);
				done();
			}
		});

		aliceSocket.emit("typing_stop", { conversationId });
	});
});
