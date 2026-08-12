/**
 * Global error handling middleware.
 * Catches all errors thrown in routes/controllers/services
 * and returns a consistent JSON response.
 */

const { v4: uuidv4 } = require("uuid");
const logger = require("../utils/logger");
const { AppError } = require("../utils/errors");

function errorHandler(err, req, res, next) {
	// Générer un ID de correlation pour tracer l'erreur
	const correlationId = req.correlationId || uuidv4();

	//Si c'est une de nos erreurs (AppError ou ses enfants)
	if (err instanceof AppError) {
		logger.warn(err.message, {
			correlationId,
			statusCode: err.statusCode,
			code: err.code,
			details: err.details,
		});

		return res.status(err.statusCode).json({
			error: {
				code: err.code,
				message: err.message,
				details: err.details,
			},
			correlationId,
			timestamp: new Date().toISOString(),
		});
	}

	//Si c'est une erreur inattendue (bug, crash, ets.)
	logger.error("Unexpected error", {
		correlationId,
		error: err.message,
		stack: err.stack,
	});

	return res.status(500).json({
		error: {
			code: "INTERNAL_ERROR",
			message: "An unexpected error occurred",
		},
		correlationId,
		timestamp: new Date().toISOString(),
	});
}

module.exports = errorHandler;
