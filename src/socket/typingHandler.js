/**
 * WebSocket typing indicator handlers.
 * Broadcasts typing status with server-side expiration via Redis TTL.
 */

const { getRedisClient } = require("../config/redis");
const Conversation = require("../models/Conversation");
const logger = require("../utils/logger");

const TYPING_TTL_SECONDS = 5;

function typingHandler(io, socket) {
	const userId = socket.data.user.userId;

	/**
	 * Event: typing_start
	 * Payload: { conversationId }
	 */
	socket.on("typing_start", async (data) => {
		try {
			const { conversationId } = data;

			// Trouver la conversation pour identifier l'autre participant
			const conversation = await Conversation.findById(conversationId);
			if (!conversation) return;

			const otherParticipant = conversation.participants.find(
				(p) => p.toString() !== userId,
			);
			if (!otherParticipant) return;

			// Stocker l'état de frappe dans Redis avec expiration
			const redis = getRedisClient();
			const key = `typing:${conversationId}:${userId}`;
			await redis.set(key, "1", { EX: TYPING_TTL_SECONDS });

			// Notifier l'autre participant
			io.to(`user:${otherParticipant.toString()}`).emit("typing_status", {
				conversationId,
				userId,
				displayName: socket.data.user.displayName,
				isTyping: true,
			});
		} catch (error) {
			logger.error("Error handling typing_start", {
				userId,
				error: error.message,
			});
		}
	});

	/**
	 * Event: typing_stop
	 * Payload: { conversationId }
	 */
	socket.on("typing_stop", async (data) => {
		try {
			const { conversationId } = data;

			const conversation = await Conversation.findById(conversationId);
			if (!conversation) return;

			const otherParticipant = conversation.participants.find(
				(p) => p.toString() !== userId,
			);
			if (!otherParticipant) return;

			// Supprimer l'état de frappe
			const redis = getRedisClient();
			const key = `typing:${conversationId}:${userId}`;
			await redis.del(key);

			// Notifier l'autre participant
			io.to(`user:${otherParticipant.toString()}`).emit("typing_status", {
				conversationId,
				userId,
				isTyping: false,
			});
		} catch (error) {
			logger.error("Error handling typing_stop", {
				userId,
				error: error.message,
			});
		}
	});
}

module.exports = typingHandler;