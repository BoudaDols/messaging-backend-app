/**
 * User routes - profile management and search.
 * All routes require authentication.
 */

const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth");
const userController = require("../controllers/userController");

// injection du middleware
router.use(authMiddleware);

// GET /api/users/search?q= - Rechercher des utilisateurs
router.get("/search", userController.searchUsers);

// GET /api/users/:id/profile - Profil public d'un utilisateur
router.get("/:id/profile", userController.getPublicProfile);

// PUT /api/users/profile - Modifier son profil
router.put("/profile", userController.updateProfile);

module.exports = router;