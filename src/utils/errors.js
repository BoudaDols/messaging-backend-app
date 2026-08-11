/**
 * Custom error classes for the messaging platform.
 * Each error carries an HTTP status code and a machine-readable error code.
 */

/**
 * Base application error - toutes les autres en héritent
 */
class AppError extends Error{
   constructor(message, statusCode, code, details = null) {
      super(message);
      this.statusCode = statusCode;
      this.code = code;
      this.details = details;
      this.name = this.constructor.name;
   }
}

/**
 * 400 - Données invalides envoyées par le client
 */
class ValidationError extends AppError{
   constructor(message, details = null) {
      super(message, 400, 'VALIDATION_ERROR', details);
   }
}

/**
 * 401 - Non Authentifié (pas de token , token expiré, mauvais credentials)
 */
class UnauthorizedError extends AppError {
   constructor(message = 'Authentication required') {
      super(message, 401, 'UNAUTHORIZED');
   }
}

/**
 * 403 - Authentifié mais pas autorisé à acceder a cette ressource
 */
class ForbiddenError extends AppError {
   constructor(message = "Access denied"){
      super(message, 403, 'FORBIDDEN');
   }
}

/**
 * 404 - Ressource introuvable
 */
class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
  }
}

/**
 * 409 - Conflit (ex: email déjà utilisé, contact déjà ajouté)
 */
class ConflictError extends AppError {
  constructor(message, details = null) {
    super(message, 409, 'CONFLICT', details);
  }
}

/**
 * 413 - Fichier trop gros
 */
class PayloadTooLargeError extends AppError {
  constructor(message = 'File exceeds maximum size', details = null) {
    super(message, 413, 'PAYLOAD_TOO_LARGE', details);
  }
}

/**
 * 429 - Trop de tentatives (rate limiting, account lock)
 */
class RateLimitError extends AppError {
  constructor(message = 'Too many requests') {
    super(message, 429, 'RATE_LIMITED');
  }
}

/**
 * 503 - Service indisponible (DB down, Redis down)
 */
class ServiceUnavailableError extends AppError {
  constructor(message = 'Service temporarily unavailable') {
    super(message, 503, 'SERVICE_UNAVAILABLE');
  }
}

module.exports = {
  AppError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  PayloadTooLargeError,
  RateLimitError,
  ServiceUnavailableError
};