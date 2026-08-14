require("dotenv").config({ path: process.env.DOTENV_CONFIG_PATH || ".env" });

const express = require("express");
const errorHandler = require("./src/middleware/errorHandler");

// Import des routes
const authRoutes = require("./src/routes/auth");

const app = express();

// Middleware pour parser le JSON dans le body des requêtes
app.use(express.json());

// Route de test
app.get("/", (_req, res) => {
	res.json({ message: "Welcome to the messaging platform API" });
});

// Monter les routes
app.use("/api/auth", authRoutes);

// Error handler — toujours en dernier
app.use(errorHandler);

module.exports = app;
