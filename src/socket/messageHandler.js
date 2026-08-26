/**
 * WebSocket message event handlers.
 * Handles send_message and message_read events.
 */

const logger = require("../utils/logger");

function messageHandler(io, socket) {
	const userId = socket.data.user.userId;

	// Placeholder — on implémentera dans la tâche 9.2
	socket.on("send_message", (data) => {
		logger.debug("send_message event received", { userId, data });
	});
}

module.exports = messageHandler;
