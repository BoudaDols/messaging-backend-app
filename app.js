require('dotenv').config();

const express = require('express');
const logger = require('./src/utils/logger');
const config = require('./src/config/env');
const errorHandler = require('./src/middleware/errorHandler');
const { connectDatabase } = require('./src/config/database');
const { connectRedis } = require('./src/config/redis');

// Import des routes
const authRoutes = require('./src/routes/auth');

const app = express();

// Middleware pour parser le JSON dans le body des requêtes
app.use(express.json());

// Route de test
app.get("/", (req, res) => {
  res.json({ message: "Welcome to the messaging platform API" });
});

// Monter les routes
app.use('/api/auth', authRoutes);

// Error handler — toujours en dernier
app.use(errorHandler);

// Démarrer le serveur
async function startServer() {
  await connectDatabase();
  await connectRedis();

  app.listen(config.port, () => {
    logger.info('Server started', { port: config.port });
  });
}

startServer();
