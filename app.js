require('dotenv').config();

const express = require('express');
const logger = require('./src/utils/logger');
const config = require('./src/config/env');
const errorHandler = require('./src/middleware/errorHandler');
const { connectDatabase } = require('./src/config/database');
const { connectRedis } = require('./src/config/redis');

const app = express();

app.get("/", (req, res) => {
   res.json({
      message: "Welcome to the home page"
   });
});

// Error handler — toujours en dernier middleware
app.use(errorHandler);

// Démarrer l'app : connecter aux services PUIS écouter
async function startServer() {
  await connectDatabase();
  await connectRedis();

  app.listen(config.port, () => {
    logger.info('Server started', { port: config.port });
  });
}

startServer();
