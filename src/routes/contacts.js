/**
 * Contact routes - manage user's contact list.
 * All routes require authentication.
 */

const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth");
const contactController = require("../controllers/contactController");

// Toutes les routes nécessitent un JWT valide
router.use(authMiddleware);

// GET /api/contacts - Liste des contacts
router.get("/", contactController.getContacts);

// POST /api/contacts - Ajouter un contact
router.post("/", contactController.addContact);

// DELETE /api/contacts/:userId - Supprimer un contact
router.delete("/:userId", contactController.removeContact);

module.exports = router;