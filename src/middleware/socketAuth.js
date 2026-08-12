// src/middleware/socketAuth.js

/**
 * JWT authentication middleware for Socket.io connections.
 * Validates token from socket handshake and attaches user data to socket.
 */

const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

function socketAuthMiddleware(socket, next) {
  // 1. Extraire le token du handshake
  const token = socket.handshake.auth.token;

  if (!token) {
    logger.warn('Socket connection rejected: no token', {
      socketId: socket.id
    });
    return next(new Error('Authentication required'));
  }

  // 2. Vérifier et décoder le token
  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // 3. Attacher les données à socket.data
    socket.data.user = {
      userId: decoded.userId,
      email: decoded.email,
      displayName: decoded.displayName
    };

    logger.debug('Socket authenticated', {
      userId: decoded.userId,
      socketId: socket.id
    });

    // 4. Connexion acceptée
    next();
  } catch (error) {
    logger.warn('Socket connection rejected: invalid token', {
      socketId: socket.id,
      error: error.message
    });
    next(new Error('Invalid or expired token'));
  }
}

module.exports = socketAuthMiddleware;
