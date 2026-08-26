/**
 * Message controller - handles message sending and history retrieval.
 */

const messageService = require("../services/messageService");
const Conversation = require("../models/Conversation");
const { NotFoundError, ValidationError } = require("../utils/errors");

/**
 * GET /api/conversations/:id/messages
 * Récupère l'historique des messages avec pagination par curseur
 */
async function getMessages(req, res, next) {
	try {
		const userId = req.user.userId;
		const { id: conversationId } = req.params;
		const { cursor } = req.query;

		// Vérifier que l'utilisateur fait partie de cette conversation
		const conversation = await Conversation.findOne({
			_id: conversationId,
			participants: userId,
		});

		if (!conversation) {
			throw new NotFoundError("Conversation not found");
		}

		const result = await messageService.getConversationMessages(
			conversationId,
			cursor || null,
		);

		res.json({
			messages: result.messages,
			nextCursor: result.nextCursor,
			hasMore: result.hasMore,
		});
	} catch (error) {
		next(error);
	}
}

/**
 * POST /api/conversations/:id/messages
 * Envoie un message dans une conversation (fallback REST quand WebSocket indisponible)
 */
async function sendMessage(req, res, next) {
	try {
		const userId = req.user.userId;
		const { id: conversationId } = req.params;
		const { content, recipientId } = req.body;

		// Si un conversationId est fourni, vérifier l'appartenance
		if (conversationId !== "new") {
			const conversation = await Conversation.findOne({
				_id: conversationId,
				participants: userId,
			});

			if (!conversation) {
				throw new NotFoundError("Conversation not found");
			}

			// Trouver le destinataire dans les participants
			const recipient = conversation.participants.find(
				(p) => p.toString() !== userId,
			);

			const message = await messageService.createMessage(
				userId,
				recipient.toString(),
				content,
			);

			return res.status(201).json({
				message: "Message sent successfully",
				data: message,
			});
		}

		// Nouvelle conversation
		if (!recipientId) {
			throw new ValidationError(
				"recipientId is required for new conversations",
				{
					field: "recipientId",
				},
			);
		}

		const message = await messageService.createMessage(
			userId,
			recipientId,
			content,
		);

		res.status(201).json({
			message: "Message sent successfully",
			data: message,
		});
	} catch (error) {
		next(error);
	}
}

module.exports = {
	getMessages,
	sendMessage,
};
