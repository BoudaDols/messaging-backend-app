/**
 * Socket.io server setup with Redis adapter for horizontal scaling.
 * Handles authentication, connection tracking, and event routing.
 */

const { Server } = require("socket.io");
const { createAdapter } = require("@socket.io/redis-adapter");
const { createClient } = require("redis");
const socketAuthMiddleware = require("../middleware/socketAuth");
const logger = require("../utils/logger");

let io;

/**
 * Initialise le serveur Socket.io et l'attache au serveur HTTP
 */
async function initializeSocket(httpServer) {
	io = new Server(httpServer, {
		cors: {
			origin: "*", // Restreindre aux domaines autorisés en prod
			methods: ["GET", "POST"],
		},
		pingInterval: 25000, //Heartbeat every 25 s
		pingTimeout: 10000, // Timeout is no response in 10 s
	});

	// Configurer l'adapter Redis pour le scaling horizontal
	const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
	const pubClient = createClient({ url: redisUrl });
	const subClient = pubClient.duplicate();

	await pubClient.connect();
	await subClient.connect();

	io.adapter(createAdapter(pubClient, subClient));

	logger.info("Socket.io Redis adapter connected");

	// Middleware d'authentification - verifie le JWT à la connexion
	io.use(socketAuthMiddleware);

	// Gestion des connexions
	io.on("connection", (socket) => {
		handleConnection(socket);
	});

	logger.info("Socket.io server initialiazed");

	return io;
}

/**
 * Gère une nouvelle connexion WebSocket
 */
function handleConnection(socket) {
	const userId = socket.data.user.userId;

	// Joindre une room personnelle (Pur recevoir les messages privés)
	socket.join(`user:${userId}`);

	logger.info("user connected via Websocket", {
		userId,
		socketId: socket.id,
	});

	// Charger les hendlers d'evenements
	const messageHandler = require("./messageHandler");
	const typingHandler = require("./typingHandler");
	const presenceHandler = require("./presenceHandler");

	messageHandler(io, socket);
	typingHandler(io, socket);
	presenceHandler(io, socket);

	// Deconnexion
	socket.on("disconnect", (reason) => {
		logger.info("User disconnected", {
			userId,
			socketId: socket.id,
			reason,
		});
	});
}

/**
 * Retourne l'instance Socket.io (pour l'utiliser dans d'autres modules)
 */
function getIO() {
	if (!io) {
		throw new Error(
			"Socket.io not initialized. Call initializeSocket() first.",
		);
	}
	return io;
}

module.exports = { initializeSocket, getIO };
