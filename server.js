const http = require("node:http");
const app = require("./app");
const logger = require("./src/utils/logger");
const config = require("./src/config/env");
const { connectDatabase } = require("./src/config/database");
const { connectRedis } = require("./src/config/redis");
const { initializeSocket } = require("./src/socket/index");

async function startServer() {
	await connectDatabase();
	await connectRedis();

	// Créer le serveur HTTP (nécessaire pour Socket.io)
	const httpServer = http.createServer(app);

	// Initialiser Socket.io
	await initializeSocket(httpServer);

	// Écouter sur le port (httpServer au lieu de app.listen)
	httpServer.listen(config.port, () => {
		logger.info("Server started", { port: config.port });
	});
}

startServer();
