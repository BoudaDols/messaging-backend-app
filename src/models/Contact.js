/**
 * Contact model - represents a contact relationship between two users.
 * Unidirectional: user A adding user B doesn't mean B has A.
 */

const mongoose = require("mongoose");
const { Schema } = mongoose;

const ContactSchema = new Schema({
	userId: {
		type: Schema.Types.ObjectId,
		ref: "User",
		required: true,
	},
	contactId: {
		type: Schema.Types.ObjectId,
		ref: "User",
		required: true,
	},
	createdAt: {
		type: Date,
		default: Date.now,
	},
});

// Un utilisateur ne peut pas ajouter le meme contact 2 fois
ContactSchema.index({ userId: 1, contactId: 1 }, { unique: true });

// Pour recuperer rapidement la liste de contacts d'un user
ContactSchema.index({ userId: 1 });

module.exports = mongoose.model("Contact", ContactSchema);
