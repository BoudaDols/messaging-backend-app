/**
 * WebSocket message event handlers.
 * Handles send_message and message_read events.
 */

const messageService = require("../services/messageService");
const logger = require("../utils/logger");

function messageHandler(io, socket) {
	const userId = socket.data.user.userId;

	/**
	 * Event: send_message
	 * Payload: { recipientId, content }
	 * Emits: message_ack (to sender), new_message (to recipient)
	 */
	socket.on("send_message", async (data, callback) => {
		try {
			const { recipientId, content } = data;

			// creer le message via le service
			const message = await messageService.createMessage(
				userId,
				recipientId,
				content,
			);

			// Confirmer au sender
			const ack = {
				messageId: message._id,
				conversationId: message.conversationId,
				status: "sent",
				timestamp: message.createdAt,
			};

			// Si le client a fourni un callback, l'utiliser
			if (typeof callback === "function") {
				callback({ success: true, ...ack });
			}

			// Emettre un event message_ack
			socket.emit("message_ack", ack);

			// Envoyer le message au destinataire
			io.to(`user:${recipientId}`).emit("new_message", {
				_id: message._id,
				conversationId: message.conversationId,
				senderId: userId,
				recipientId,
				content: message.content,
				deliveryStatus: message.deliveryStatus,
				readStatus: message.readStatus,
				createdAt: message.createdAt,
			});

			logger.info("Message sent via WebSocket", {
				messageId: message._id,
				senderId: userId,
				recipientId,
			});
		} catch (error) {
			logger.error("Error sending message via WebSocket", {
				userId,
				error: error.message,
			});

			// Notifier le sender de l'échec
			if (typeof callback === "function") {
				callback({ success: false, error: error.message });
			} else {
				socket.emit("message_error", { error: error.message });
			}
		}
	});

	/**
	 * Event: message_read
	 * Payload: { messageIds: string[] }
	 * Emits: read_receipt (to original sender)
	 */
	socket.on("message_read", async (data) => {
		try {
			const { messageIds } = data;

			if (
				!messageIds ||
				!Array.isArray(messageIds) ||
				messageIds.length === 0
			) {
				return;
			}

			// Limiter à 100 messages par batch
			const batch = messageIds.slice(0, 100);

			const result = await messageService.updateReadStatus(batch, userId);

			// Notifier les expéditeurs originaux
			if (result.markedAsRead > 0) {
				// Récupérer les messages pour connaître les senders
				const Message = require("../models/Message");
				const messages = await Message.find({ _id: { $in: batch } }).select(
					"senderId",
				);

				// Grouper par sender
				const senderIds = [
					...new Set(messages.map((m) => m.senderId.toString())),
				];

				for (const senderId of senderIds) {
					io.to(`user:${senderId}`).emit("read_receipt", {
						messageIds: batch,
						readerId: userId,
						readAt: new Date().toISOString(),
					});
				}
			}

			logger.debug("Messages marked as read", {
				userId,
				count: result.markedAsRead,
			});
		} catch (error) {
			logger.error("Error processing read receipts", {
				userId,
				error: error.message,
			});
		}
	});

	/**
	 * À la connexion : envoyer les messages non-livrés
	 */
	(async () => {
		try {
			const undelivered = await messageService.getUndeliveredMessages(userId);

			if (undelivered.length > 0) {
				socket.emit("undelivered_messages", undelivered);

				// Mettre à jour le statut de livraison
				for (const msg of undelivered) {
					await messageService.updateDeliveryStatus(msg._id, "delivered");
				}

				logger.info("Delivered offline messages", {
					userId,
					count: undelivered.length,
				});
			}
		} catch (error) {
			logger.error("Error delivering offline messages", {
				userId,
				error: error.message,
			});
		}
	})();
}

module.exports = messageHandler;
