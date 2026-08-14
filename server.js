const app = require("./app");
const logger = require("./src/utils/logger");
const config = require("./src/config/env");
const { connectDatabase } = require("./src/config/database");
const { connectRedis } = require("./src/config/redis");

async function startServer() {
	await connectDatabase();
	await connectRedis();

	app.listen(config.port, () => {
		logger.info("Server started", { port: config.port });
	});
}

startServer();
