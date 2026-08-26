/**
 * Conversation controller - handles conversation listing and management.
 */

const Conversation = require("../models/Conversation");
const { NotFoundError } = require("../utils/errors");

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

/**
 * GET /api/conversations
 * Liste les conversations de l'utilisateur connecté, triées par activité récente
 */
async function getConversations(req, res, next) {
	try {
		const userId = req.user.userId;
		const page = parseInt(req.query.page, 10) || 1;
		const limit = Math.min(
			parseInt(req.query.limit, 10) || DEFAULT_PAGE_SIZE,
			MAX_PAGE_SIZE,
		);
		const skip = (page - 1) * limit;

		const conversations = await Conversation.find({
			participants: userId,
			deletedBy: { $nin: [userId] },
		})
			.sort({ "lastMessage.createdAt": -1 })
			.skip(skip)
			.limit(limit)
			.populate("participants", "displayName email avatar presence");

		const total = await Conversation.countDocuments({
			participants: userId,
			deletedBy: { $nin: [userId] },
		});

		const formattedConversations = conversations.map((conv) => {
			// Trouver l'autre participant
			const otherParticipant = conv.participants.find(
				(p) => p._id.toString() !== userId,
			);

			return {
				id: conv._id,
				participant: otherParticipant
					? {
							id: otherParticipant._id,
							displayName: otherParticipant.displayName,
							email: otherParticipant.email,
							avatar: otherParticipant.avatar,
							presence: otherParticipant.presence,
						}
					: null,
				lastMessage: conv.lastMessage,
				unreadCount: conv.unreadCount.get(userId) || 0,
				createdAt: conv.createdAt,
			};
		});

		res.json({
			conversations: formattedConversations,
			total,
			page,
			totalPages: Math.ceil(total / limit),
		});
	} catch (error) {
		next(error);
	}
}

/**
 * DELETE /api/conversations/:id
 * Soft-delete une conversation pour l'utilisateur connecté
 */
async function deleteConversation(req, res, next) {
	try {
		const userId = req.user.userId;
		const { id } = req.params;

		const conversation = await Conversation.findOne({
			_id: id,
			participants: userId,
		});

		if (!conversation) {
			throw new NotFoundError("Conversation not found");
		}

		// Ajouter l'utilisateur à la liste deletedBy
		if (!conversation.deletedBy.includes(userId)) {
			conversation.deletedBy.push(userId);
			await conversation.save();
		}

		res.json({ message: "Conversation deleted successfully" });
	} catch (error) {
		next(error);
	}
}

module.exports = {
	getConversations,
	deleteConversation,
};
