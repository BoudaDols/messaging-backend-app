/**
 * Environment configuration validation and export.
 * Crashes on startup if required variables are missing.
 */

//Liste des variables OBLIGATOIRES
const requiredVars = [
	"PORT",
	"SERVICE_NAME",
	"LOG_LEVEL",
	"DB_URL",
	"REDIS_URL",
	"JWT_SECRET",
];

/**
 * Vérifie que toutes les variables obligatoires sont définies
 */
function validateEnv() {
	const missing = requiredVars.filter((varName) => !process.env[varName]);

	if (missing.length > 0) {
		console.error(
			`❌ Missing required environment variables: ${missing.join(", ")}`,
		);
		console.error("Please check your .env file.");
		process.exit(1); // Arrête l'application immédiatement
	}
}

validateEnv();

module.exports = {
	port: parseInt(process.env.PORT, 10),
	serviceName: process.env.SERVICE_NAME,
	logLevel: process.env.LOG_LEVEL,
};
