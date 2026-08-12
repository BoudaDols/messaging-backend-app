/**
 * MongoDB connection management with Mongoose.
 * Implements connection pooling and reconnection logic.
 */

const mongoose = require("mongoose");
const logger = require("../utils/logger");

// Configuration de la connexion
const DB_OPTIONS = {
	maxPoolSize: 10, // Nombre max de connexions simultanées
	minPoolSize: 2, // Nombre min de connexions maintenues
	serverSelectionTimeoutMS: 5000, // Timeout pour trouver le serveur
	heartbeatFrequencyMS: 10000, // Vérifier que la DB est vivante
};

/**
 * Connecte l'application à MongoDB
 */
async function connectDatabase() {
	const dbUrl = process.env.DB_URL;

	if (!dbUrl) {
		logger.error("DB_URL is not defined");
		process.exit(1);
	}

	try {
		await mongoose.connect(dbUrl, DB_OPTIONS);
		logger.info("MongoDB connected successfully", { url: dbUrl });
	} catch (error) {
		logger.error("MongoDB connection failed", { error: error.message });
		process.exit(1);
	}

	// Écouter les événements de connexion
	mongoose.connection.on("disconnected", () => {
		logger.warn("MongoDB disconnected");
	});

	mongoose.connection.on("reconnected", () => {
		logger.info("MongoDB reconnected");
	});

	mongoose.connection.on("error", (err) => {
		logger.error("MongoDB error", { error: err.message });
	});
}

module.exports = { connectDatabase };
