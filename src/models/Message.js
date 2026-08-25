/**
 * Message model - represents a single message in a conversation.
 * Stores content, sender/recipient, delivery and read status.
 */

const mongoose = require("mongoose");
const { Schema } = mongoose;

const MessageSchema = new Schema({
   conversationId: {
      type: Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
   },
   senderId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
   },
   recipientId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
   },
   content: {
      type: String,
      maxLength: 10000,
   },
   fileAttachment: {
      fileId: String,
      fileName: String,
      fileSize: Number,
      mimeType: String,
      url: String,
      thumbnailUrl: String,
   },
   deliveryStatus: {
      type: String,
      enum: ["pending", "sent", "delivered", "undelivered", "failed"],
      default: "sent",
   },
   readStatus: {
      isRead: {
         type: Boolean,
         default: false,
      },
      readAt: Date,
   },
   createdAt: {
      type: Date,
      default: Date.now,
   },
});

// Index composé pour récupérer l'historique d'une conversation efficacement
// -1 = ordre décroissant (plus récents en premier)
MessageSchema.index({ conversationId: 1, createdAt: -1 });

// Index pour récupérer les messages non-livrés d'un utilisateur
MessageSchema.index({ recipientId: 1, deliveryStatus: 1, createdAt: 1 });


module.exports = mongoose.model("Message", MessageSchema);