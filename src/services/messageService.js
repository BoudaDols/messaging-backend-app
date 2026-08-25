/**
 * Message service - handles message creation, retrieval, and status management.
 * Implements cursor-based pagination and conversation management.
 */

const Message = require("../models/Message");
const Conversation = require("../models/Conversation");
const User = require("../models/User");
const { ValidationError, NotFoundError } = require("../utils/errors");
const logger = require("../utils/logger");

const MAX_MESSAGE_LENGTH = 10000;
const DEFAULT_PAGE_SIZE = 50;
const MAX_UNDELIVERED_MESSAGES = 1000;

/**
 * Crée un nouveau message et met à jour la conversation
 */
async function createMessage(senderId, recipientId, content, fileAttachment = null) {
   // Valider le contenu
   if(!fileAttachment){
      if(!content || typeof content !== "string" || content.trim().length === 0){
         throw new ValidationError("Message content is required", { field: "content" });
      }
      if(content.length > MAX_MESSAGE_LENGTH){
         throw new ValidationError(`Message content must not exceed ${MAX_MESSAGE_LENGTH} characters`,
				{ field: "content", max: MAX_MESSAGE_LENGTH },
         );
      }
   }

   // Verifier que le destinataire existe
   const recipient = await User.findById(recipientId);
   if(!recipient){
      throw new NotFoundError("Recipient not found");
   }

   // Trouver ou creer la conversation
   const conversation = await findOrCreateConversation(senderId, recipientId);

   // Creer le message
   const message = await Message.create({
      conversationId: conversation._id,
		senderId,
		recipientId,
		content: content ? content.trim() : null,
		fileAttachment,
		deliveryStatus: "sent",
   });

   // Mettre a jour la conversation
   const preview = content
                  ? content.substring(0, 100)
                  : "Fichier";

   conversation.lastMessage = {
      content: preview,
		senderId,
		createdAt: message.createdAt,
   };

   // Incrementer le compteur de non lu pour le destinataire
   const currentCount = conversation.unreadCount.get(recipientId.toString()) || 0;
   conversation.unreadCount.set(recipientId.toString(), currentCount + 1);

   await conversation.save();

   logger.info("Message created", {
      messageId: message._id,
		conversationId: conversation._id,
		senderId,
		recipientId,
   });

   return message;
}


/**
 * Trouve une conversation existante entre 2 utilisateurs, ou en crée une nouvelle
 */
async function findOrCreateConversation(userIdA, userIdB){
   // Chercher une conversation existante avec ces 2 participants
   let conversation = await Conversation.findOne({
      participants: { $all: [userIdA, userIdB] },
		deletedBy: { $nin: [userIdA] }, // Pas supprimée par l'envoyeur
   });

   if(!conversation){
      conversation = await Conversation.create({
         participants: [userIdA, userIdB],
      });
   }

   return conversation;
}

/**
 * Récupère l'historique des messages avec pagination par curseur
 */
async function getConversationMessages(conversationId, cursor = null, limit = DEFAULT_PAGE_SIZE) {
	const query = { conversationId };

	// Si un curseur est fourni, on cherche les messages AVANT ce timestamp
	if (cursor) {
		query.createdAt = { $lt: new Date(cursor) };
	}

	const messages = await Message.find(query)
		.sort({ createdAt: -1 })
		.limit(limit)
		.populate("senderId", "displayName avatar");

	// Déterminer le prochain curseur
	const nextCursor = messages.length === limit
		? messages[messages.length - 1].createdAt.toISOString()
		: null;

	return {
		messages,
		nextCursor,
		hasMore: messages.length === limit,
	};
}

/**
 * Récupère les messages non-livrés pour un utilisateur (après reconnexion)
 */
async function getUndeliveredMessages(userId) {
	const thirtyDaysAgo = new Date();
	thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

	const messages = await Message.find({
		recipientId: userId,
		deliveryStatus: "undelivered",
		createdAt: { $gte: thirtyDaysAgo },
	})
		.sort({ createdAt: 1 })
		.limit(MAX_UNDELIVERED_MESSAGES)
		.populate("senderId", "displayName avatar");

	return messages;
}

/**
 * Met à jour le statut de livraison d'un message
 */
async function updateDeliveryStatus(messageId, status) {
	const validStatuses = ["sent", "delivered", "undelivered", "failed"];
	if (!validStatuses.includes(status)) {
		throw new ValidationError("Invalid delivery status", { field: "status", allowed: validStatuses });
	}

	const message = await Message.findByIdAndUpdate(
		messageId,
		{ deliveryStatus: status },
		{ returnDocument: "after" },
	);

	if (!message) {
		throw new NotFoundError("Message not found");
	}

	return message;
}

/**
 * Marque des messages comme lus (batch)
 */
async function updateReadStatus(messageIds, readerId) {
	const result = await Message.updateMany(
		{
			_id: { $in: messageIds },
			recipientId: readerId,
			"readStatus.isRead": false, // Idempotent : ne met à jour que ceux pas encore lus
		},
		{
			$set: {
				"readStatus.isRead": true,
				"readStatus.readAt": new Date(),
			},
		},
	);

	// Mettre à jour le compteur unread dans les conversations concernées
	if (result.modifiedCount > 0) {
		const messages = await Message.find({ _id: { $in: messageIds } }).select("conversationId");
		const conversationIds = [...new Set(messages.map((m) => m.conversationId.toString()))];

		for (const convId of conversationIds) {
			const conversation = await Conversation.findById(convId);
			if (conversation) {
				conversation.unreadCount.set(readerId.toString(), 0);
				await conversation.save();
			}
		}
	}

	return { markedAsRead: result.modifiedCount };
}

module.exports = {
	createMessage,
	findOrCreateConversation,
	getConversationMessages,
	getUndeliveredMessages,
	updateDeliveryStatus,
	updateReadStatus,
};