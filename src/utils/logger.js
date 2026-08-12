/**
 * Structured logger for the messaging platform.
 * Provides consistent log formatting across all services.
 */

const { v4: uuidv4 } = require("uuid");

const LOG_LEVELS = {
	debug: 0,
	info: 1,
	warn: 2,
	error: 3,
};

const currentLevel = process.env.LOG_LEVEL || "debug";

/**
 * Crée un log structuré au format JSON
 */
function createLog(level, message, metadata = {}) {
	//Ne rien afficher si le niveau de log est inferieur au niveau minimal
	if (LOG_LEVELS[level] < LOG_LEVELS[currentLevel]) {
		return;
	}

	const logEntry = {
		timestamp: new Date().toISOString(),
		service: process.env.SERVICE_NAME || "api-server",
		level,
		correlationId: metadata.correlationId || uuidv4(),
		message,
		metadata,
	};

	//en dev, rendre lisible. en prod, JSON pur
	const output = JSON.stringify(logEntry);

	if (level === "error") {
		console.error(output);
	} else if (level === "warn") {
		console.warn(output);
	} else {
		console.log(output);
	}
}

module.exports = {
	debug: (message, metadata) => createLog("debug", message, metadata),
	info: (message, metadata) => createLog("info", message, metadata),
	warn: (message, metadata) => createLog("warn", message, metadata),
	error: (message, metadata) => createLog("error", message, metadata),
};
