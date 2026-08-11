/**
 * Redis client setup with reconnection logic.
 * Used for pub/sub, caching, and ephemeral state.
 */

const { createClient } = require('redis');
const logger = require('../utils/logger');

let redisClient = null;

/**
 * Crée et connecte le client Redis
 */
async function connectRedis() {
  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    logger.error('REDIS_URL is not defined');
    process.exit(1);
  }

  redisClient = createClient({ url: redisUrl });

  // Écouter les événements
  redisClient.on('connect', () => {
    logger.info('Redis connected successfully', { url: redisUrl });
  });

  redisClient.on('error', (err) => {
    logger.error('Redis error', { error: err.message });
  });

  redisClient.on('reconnecting', () => {
    logger.warn('Redis reconnecting...');
  });

  try {
    await redisClient.connect();
  } catch (error) {
    logger.error('Redis connection failed', { error: error.message });
    process.exit(1);
  }
}

/**
 * Retourne le client Redis (pour l'utiliser ailleurs)
 */
function getRedisClient() {
  if (!redisClient) {
    throw new Error('Redis client not initialized. Call connectRedis() first.');
  }
  return redisClient;
}

module.exports = { connectRedis, getRedisClient };
