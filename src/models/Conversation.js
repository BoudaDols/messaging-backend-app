/**
 * Conversation model - represents a direct message thread between two users.
 * Tracks participants, last message preview, unread counts, and soft-deletes.
 */

const mongoose = require("mongoose");
const { Schema } = mongoose;

const ConversationSchema = new Schema({
	participants: [
		{
			type: Schema.Types.ObjectId,
			ref: "User",
			required: true,
		},
	],
	lastMessage: {
		content: String,
		senderId: Schema.Types.ObjectId,
		createdAt: Date,
	},
	unreadCount: {
		type: Map,
		of: Number,
		default: new Map(),
	},
	deletedBy: [
		{
			type: Schema.Types.ObjectId,
			ref: "User",
		},
	],
	createdAt: { type: Date, default: Date.now },
	updatedAt: { type: Date, default: Date.now },
});

// Index pour lister les conversations d'un utilisateur triées par activité
ConversationSchema.index({ participants: 1, "lastMessage.createdAt": -1 });

// Met à jour "updatedAt" automatiquement
ConversationSchema.pre("save", function () {
	this.updatedAt = new Date();
});

module.exports = mongoose.model("Conversation", ConversationSchema);
