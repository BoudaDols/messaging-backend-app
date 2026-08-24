/**
 * Contact controller - handles contact list CRUD operations.
 * All routes require authentication.
 */

const Contact = require("../models/Contact");
const User = require("../models/User");
const { NotFoundError, ConflictError } = require("../utils/errors");

/**
 * GET /api/contacts
 * Retourne la liste de contacts triée alphabétiquement
 */

async function getContacts(req, res, next) {
	try {
		const contacts = await Contact.find({ userId: req.user.userId })
			.populate("contactId", "displayName email avatar presence")
			.sort({ "contactId.displayName": 1 });

		// Trier alphabétiquement par displayName (case-insensitive)
		const sortedContacts = contacts
			.map((c) => ({
				id: c.contactId._id,
				displayName: c.contactId.displayName,
				email: c.contactId.email,
				avatar: c.contactId.avatar,
				presence: c.contactId.presence,
				addedAt: c.createdAt,
			}))
			.sort((a, b) =>
				a.displayName.toLowerCase().localeCompare(b.displayName.toLowerCase()),
			);

		res.json({
			contacts: sortedContacts,
			count: sortedContacts.length,
		});
	} catch (error) {
		next(error);
	}
}

/**
 * POST /api/contacts
 * Ajouter un utilisateur à ses contacts
 * Body: { contactId: "userId" }
 */
async function addContact(req, res, next) {
	try {
		const { contactId } = req.body;

		// Vérifier que l'utilisateur cible existe
		const targetUser = await User.findById(contactId);
		if (!targetUser) {
			throw new NotFoundError("User not found");
		}

		// Empêcher de s'ajouter soi-même
		if (contactId === req.user.userId) {
			throw new ConflictError("Cannot add yourself as a contact");
		}

		// Créer la relation
		try {
			await Contact.create({
				userId: req.user.userId,
				contactId,
			});
		} catch (error) {
			// Doublon (index unique violé)
			if (error.code === 11000) {
				throw new ConflictError("Contact already exists");
			}
			throw error;
		}

		// Retourner la liste mise à jour
		const contacts = await Contact.find({ userId: req.user.userId }).populate(
			"contactId",
			"displayName email avatar presence",
		);

		const sortedContacts = contacts
			.map((c) => ({
				id: c.contactId._id,
				displayName: c.contactId.displayName,
				email: c.contactId.email,
				avatar: c.contactId.avatar,
				presence: c.contactId.presence,
				addedAt: c.createdAt,
			}))
			.sort((a, b) =>
				a.displayName.toLowerCase().localeCompare(b.displayName.toLowerCase()),
			);

		res.status(201).json({
			message: "Contact added successfully",
			contacts: sortedContacts,
			count: sortedContacts.length,
		});
	} catch (error) {
		next(error);
	}
}

/**
 * DELETE /api/contacts/:userId
 * Supprimer un utilisateur de ses contacts
 */
async function removeContact(req, res, next) {
	try {
		const { userId } = req.params;

		const result = await Contact.findOneAndDelete({
			userId: req.user.userId,
			contactId: userId,
		});

		if (!result) {
			throw new NotFoundError("Contact not found");
		}

		// Retourner la liste mise à jour
		const contacts = await Contact.find({ userId: req.user.userId }).populate(
			"contactId",
			"displayName email avatar presence",
		);

		const sortedContacts = contacts
			.map((c) => ({
				id: c.contactId._id,
				displayName: c.contactId.displayName,
				email: c.contactId.email,
				avatar: c.contactId.avatar,
				presence: c.contactId.presence,
				addedAt: c.createdAt,
			}))
			.sort((a, b) =>
				a.displayName.toLowerCase().localeCompare(b.displayName.toLowerCase()),
			);

		res.json({
			message: "Contact removed successfully",
			contacts: sortedContacts,
			count: sortedContacts.length,
		});
	} catch (error) {
		next(error);
	}
}

module.exports = {
	getContacts,
	addContact,
	removeContact,
};
