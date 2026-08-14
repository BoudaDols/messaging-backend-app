/**
 * User model - defines the shape of user documents in MongoDB.
 * Handles user data, authentication state, and preferences.
 */

const mongoose = require("mongoose");
const { Schema } = mongoose;

const UserSchema = new Schema({
	email: {
		type: String,
		required: true,
		unique: true,
		lowercase: true,
		trim: true,
	},
	passwordHash: {
		type: String,
		required: true,
	},
	displayName: {
		type: String,
		required: true,
		trim: true,
		minLength: 1,
		maxLength: 50,
	},
	avatar: {
		url: String,
		thumbnailUrl: String,
	},
	presence: {
		status: {
			type: String,
			enum: ["online", "offline"],
			default: "offline",
		},
		lastSeen: {
			type: Date,
			default: Date.now,
		},
	},
	loginAttempts: {
		count: {
			type: Number,
			default: 0,
		},
		lastAttemp: Date,
		lockedUntil: Date,
	},
	notificationPreferences: {
		mutedConversations: [
			{
				type: Schema.Types.ObjectId,
				ref: "Conversation",
			},
		],
	},
	createdAt: {
		type: Date,
		default: Date.now,
	},
	updatedAt: {
		type: Date,
		default: Date.now,
	},
});

// Index pour la recherche par texte (on l'utilisera plus tard)
UserSchema.index({ displayName: "text", email: "text" });

// Index sur le status de présence
UserSchema.index({ "presence.status": 1 });

// Met à jour "updatedAt" automatiquement à chaque modification
UserSchema.pre("save", function () {
	this.updatedAt = new Date();
});

module.exports = mongoose.model("User", UserSchema);
