/**
 * JWT authentication middleware for HTTP requests.
 * Extracts token from Authorization header, validates it,
 * and attaches user data to req.user.
 */

const jwt = require("jsonwebtoken");
const { UnauthorizedError } = require("../utils/errors");

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

function authMiddleware(req, res, next) {
	// 1. Extraire le header Authorization
	const authHeader = req.headers.authorization;

	if (!authHeader) {
		throw new UnauthorizedError("No token provided");
	}

	// 2. Verifier le format "Bearer <Token>
	const parts = authHeader.split(" ");

	if (parts.length !== 2 || parts[0] !== "Bearer") {
		throw new UnauthorizedError("Token format invalid. Use: Bearer <token>");
	}

	const token = parts[1];

	// 3. Verifier et decoder le token
	try {
		const decoded = jwt.verify(token, JWT_SECRET);

		// 4. Attacher les données de l'utilisateur à la requete
		req.user = {
			userId: decoded.userId,
			email: decoded.email,
			displayName: decoded.displayName,
		};

		// 5. Continuer vers la route
		next();
	} catch (error) {
		if (error.name === "TokenExpiredError") {
			throw new UnauthorizedError("Token expired");
		}
		throw new UnauthorizedError("Invalid token");
	}
}

module.exports = authMiddleware;
