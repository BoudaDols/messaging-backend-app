/**
 * Conversation and message routes.
 * All routes require authentication.
 */

const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth");
const conversationController = require("../controllers/conversationController");
const messageController = require("../controllers/messageController");

router.use(authMiddleware);

// GET /api/conversations - Liste des conversations
router.get("/", conversationController.getConversations);

// DELETE /api/conversations/:id - Supprimer une conversation
router.delete("/:id", conversationController.deleteConversation);

// GET /api/conversations/:id/messages - Historique des messages
router.get("/:id/messages", messageController.getMessages);

// POST /api/conversations/:id/messages - Envoyer un message
router.post("/:id/messages", messageController.sendMessage);

module.exports = router;
