// tests/integration/messaging.integration.test.js

const request = require("supertest");
const mongoose = require("mongoose");
const { createClient } = require("redis");
const app = require("../../app");

let redisClient;
let tokenA;
let tokenB;
let userAId;
let userBId;

beforeAll(async () => {
	const dbUrl =
		process.env.DB_URL || "mongodb://localhost:27017/messaging-platform-test";
	await mongoose.connect(dbUrl);

	const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
	redisClient = createClient({ url: redisUrl });
	await redisClient.connect();

	const { setRedisClient } = require("../../src/config/redis");
	setRedisClient(redisClient);

	// Créer User A
	const resA = await request(app)
		.post("/api/auth/register")
		.send({ email: "alice@messaging.com", password: "MyPass123!" });
	tokenA = resA.body.token;
	userAId = resA.body.user.id;

	// Créer User B
	const resB = await request(app)
		.post("/api/auth/register")
		.send({ email: "bob@messaging.com", password: "MyPass123!" });
	tokenB = resB.body.token;
	userBId = resB.body.user.id;
});

afterAll(async () => {
	const collections = mongoose.connection.collections;
	for (const key in collections) {
		await collections[key].deleteMany({});
	}
	await redisClient.flushDb();
	await mongoose.connection.close();
	await redisClient.quit();
});

describe("POST /api/conversations/new/messages", () => {
	it("should send a message and create a conversation", async () => {
		const res = await request(app)
			.post("/api/conversations/new/messages")
			.set("Authorization", `Bearer ${tokenA}`)
			.send({ recipientId: userBId, content: "Hello Bob!" });

		expect(res.status).toBe(201);
		expect(res.body.message).toBe("Message sent successfully");
		expect(res.body.data.content).toBe("Hello Bob!");
		expect(res.body.data.senderId).toBe(userAId);
		expect(res.body.data.recipientId).toBe(userBId);
		expect(res.body.data.deliveryStatus).toBe("sent");
		expect(res.body.data.conversationId).toBeDefined();
	});

	it("should reject empty message content", async () => {
		const res = await request(app)
			.post("/api/conversations/new/messages")
			.set("Authorization", `Bearer ${tokenA}`)
			.send({ recipientId: userBId, content: "" });

		expect(res.status).toBe(400);
		expect(res.body.error.code).toBe("VALIDATION_ERROR");
	});

	it("should reject message exceeding 10000 characters", async () => {
		const res = await request(app)
			.post("/api/conversations/new/messages")
			.set("Authorization", `Bearer ${tokenA}`)
			.send({ recipientId: userBId, content: "a".repeat(10001) });

		expect(res.status).toBe(400);
		expect(res.body.error.code).toBe("VALIDATION_ERROR");
	});

	it("should reject message to non-existent recipient", async () => {
		const fakeId = new mongoose.Types.ObjectId();
		const res = await request(app)
			.post("/api/conversations/new/messages")
			.set("Authorization", `Bearer ${tokenA}`)
			.send({ recipientId: fakeId.toString(), content: "Hello?" });

		expect(res.status).toBe(404);
		expect(res.body.error.code).toBe("NOT_FOUND");
	});

	it("should reject new conversation without recipientId", async () => {
		const res = await request(app)
			.post("/api/conversations/new/messages")
			.set("Authorization", `Bearer ${tokenA}`)
			.send({ content: "Hello?" });

		expect(res.status).toBe(400);
		expect(res.body.error.code).toBe("VALIDATION_ERROR");
	});

	it("should reject request without auth token", async () => {
		const res = await request(app)
			.post("/api/conversations/new/messages")
			.send({ recipientId: userBId, content: "Hello!" });

		expect(res.status).toBe(401);
	});
});

describe("POST /api/conversations/:id/messages (existing conversation)", () => {
	let conversationId;

	beforeAll(async () => {
		// Envoyer un message pour créer une conversation
		const res = await request(app)
			.post("/api/conversations/new/messages")
			.set("Authorization", `Bearer ${tokenA}`)
			.send({ recipientId: userBId, content: "First message" });
		conversationId = res.body.data.conversationId;
	});

	it("should send a message in existing conversation", async () => {
		const res = await request(app)
			.post(`/api/conversations/${conversationId}/messages`)
			.set("Authorization", `Bearer ${tokenA}`)
			.send({ content: "Second message" });

		expect(res.status).toBe(201);
		expect(res.body.data.content).toBe("Second message");
		expect(res.body.data.conversationId).toBe(conversationId);
	});

	it("should allow recipient to reply", async () => {
		const res = await request(app)
			.post(`/api/conversations/${conversationId}/messages`)
			.set("Authorization", `Bearer ${tokenB}`)
			.send({ content: "Hey Alice!" });

		expect(res.status).toBe(201);
		expect(res.body.data.senderId).toBe(userBId);
	});

	it("should reject message in non-existent conversation", async () => {
		const fakeId = new mongoose.Types.ObjectId();
		const res = await request(app)
			.post(`/api/conversations/${fakeId}/messages`)
			.set("Authorization", `Bearer ${tokenA}`)
			.send({ content: "Hello?" });

		expect(res.status).toBe(404);
	});
});

describe("GET /api/conversations", () => {
	it("should list user conversations", async () => {
		const res = await request(app)
			.get("/api/conversations")
			.set("Authorization", `Bearer ${tokenA}`);

		expect(res.status).toBe(200);
		expect(res.body.conversations.length).toBeGreaterThan(0);
		expect(res.body.conversations[0].participant).toBeDefined();
		expect(res.body.conversations[0].lastMessage).toBeDefined();
		expect(res.body.total).toBeGreaterThan(0);
	});

	it("should include unread count", async () => {
		const res = await request(app)
			.get("/api/conversations")
			.set("Authorization", `Bearer ${tokenA}`);

		expect(res.status).toBe(200);
		expect(res.body.conversations[0].unreadCount).toBeDefined();
	});

	it("should return empty list for user with no conversations", async () => {
		// Créer un nouvel utilisateur sans conversations
		const resC = await request(app)
			.post("/api/auth/register")
			.send({ email: "charlie@messaging.com", password: "MyPass123!" });

		const res = await request(app)
			.get("/api/conversations")
			.set("Authorization", `Bearer ${resC.body.token}`);

		expect(res.status).toBe(200);
		expect(res.body.conversations.length).toBe(0);
		expect(res.body.total).toBe(0);
	});

	it("should sort conversations by most recent message", async () => {
		const res = await request(app)
			.get("/api/conversations")
			.set("Authorization", `Bearer ${tokenA}`);

		expect(res.status).toBe(200);
		if (res.body.conversations.length > 1) {
			const dates = res.body.conversations.map(
				(c) => new Date(c.lastMessage.createdAt),
			);
			for (let i = 0; i < dates.length - 1; i++) {
				expect(dates[i].getTime()).toBeGreaterThanOrEqual(
					dates[i + 1].getTime(),
				);
			}
		}
	});
});

describe("GET /api/conversations/:id/messages", () => {
	let conversationId;

	beforeAll(async () => {
		// Créer une conversation avec plusieurs messages
		const res = await request(app)
			.post("/api/conversations/new/messages")
			.set("Authorization", `Bearer ${tokenA}`)
			.send({ recipientId: userBId, content: "Message 1" });
		conversationId = res.body.data.conversationId;

		// Envoyer plus de messages
		for (let i = 2; i <= 5; i++) {
			await request(app)
				.post(`/api/conversations/${conversationId}/messages`)
				.set("Authorization", `Bearer ${tokenA}`)
				.send({ content: `Message ${i}` });
		}
	});

	it("should return messages in reverse chronological order", async () => {
		const res = await request(app)
			.get(`/api/conversations/${conversationId}/messages`)
			.set("Authorization", `Bearer ${tokenA}`);

		expect(res.status).toBe(200);
		expect(res.body.messages.length).toBeGreaterThan(0);

		// Vérifier l'ordre décroissant
		const dates = res.body.messages.map((m) => new Date(m.createdAt));
		for (let i = 0; i < dates.length - 1; i++) {
			expect(dates[i].getTime()).toBeGreaterThanOrEqual(dates[i + 1].getTime());
		}
	});

	it("should include sender info (populated)", async () => {
		const res = await request(app)
			.get(`/api/conversations/${conversationId}/messages`)
			.set("Authorization", `Bearer ${tokenA}`);

		expect(res.status).toBe(200);
		expect(res.body.messages[0].senderId.displayName).toBeDefined();
	});

	it("should return hasMore=false when all messages are returned", async () => {
		const res = await request(app)
			.get(`/api/conversations/${conversationId}/messages`)
			.set("Authorization", `Bearer ${tokenA}`);

		expect(res.status).toBe(200);
		expect(res.body.hasMore).toBe(false);
		expect(res.body.nextCursor).toBeNull();
	});

	it("should support cursor-based pagination", async () => {
		// Premier appel
		const res1 = await request(app)
			.get(`/api/conversations/${conversationId}/messages`)
			.set("Authorization", `Bearer ${tokenA}`);

		// Si on a un curseur, faire un deuxième appel
		if (res1.body.nextCursor) {
			const res2 = await request(app)
				.get(
					`/api/conversations/${conversationId}/messages?cursor=${res1.body.nextCursor}`,
				)
				.set("Authorization", `Bearer ${tokenA}`);

			expect(res2.status).toBe(200);
			// Les messages de la page 2 doivent être plus anciens
			const lastOfPage1 = new Date(
				res1.body.messages[res1.body.messages.length - 1].createdAt,
			);
			const firstOfPage2 = new Date(res2.body.messages[0].createdAt);
			expect(lastOfPage1.getTime()).toBeGreaterThan(firstOfPage2.getTime());
		}
	});

	it("should reject request from non-participant", async () => {
		// Créer un 3ème user qui n'est pas dans la conversation
		const resD = await request(app)
			.post("/api/auth/register")
			.send({ email: "dave@messaging.com", password: "MyPass123!" });

		const res = await request(app)
			.get(`/api/conversations/${conversationId}/messages`)
			.set("Authorization", `Bearer ${resD.body.token}`);

		expect(res.status).toBe(404);
		expect(res.body.error.code).toBe("NOT_FOUND");
	});
});

describe("DELETE /api/conversations/:id", () => {
	let conversationId;

	beforeAll(async () => {
		// Créer une conversation
		const res = await request(app)
			.post("/api/conversations/new/messages")
			.set("Authorization", `Bearer ${tokenA}`)
			.send({ recipientId: userBId, content: "To be deleted" });
		conversationId = res.body.data.conversationId;
	});

	it("should soft-delete conversation for one user", async () => {
		const res = await request(app)
			.delete(`/api/conversations/${conversationId}`)
			.set("Authorization", `Bearer ${tokenA}`);

		expect(res.status).toBe(200);
		expect(res.body.message).toBe("Conversation deleted successfully");
	});

	it("should not appear in deleted user's list", async () => {
		const res = await request(app)
			.get("/api/conversations")
			.set("Authorization", `Bearer ${tokenA}`);

		const ids = res.body.conversations.map((c) => c.id);
		expect(ids).not.toContain(conversationId);
	});

	it("should still appear in other user's list", async () => {
		const res = await request(app)
			.get("/api/conversations")
			.set("Authorization", `Bearer ${tokenB}`);

		const ids = res.body.conversations.map((c) => c.id);
		expect(ids).toContain(conversationId);
	});

	it("should return 404 for non-existent conversation", async () => {
		const fakeId = new mongoose.Types.ObjectId();
		const res = await request(app)
			.delete(`/api/conversations/${fakeId}`)
			.set("Authorization", `Bearer ${tokenA}`);

		expect(res.status).toBe(404);
	});
});
