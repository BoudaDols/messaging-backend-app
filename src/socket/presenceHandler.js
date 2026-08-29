/**
 * WebSocket presence handlers.
 * Wires connection/disconnection events to the presence service.
 */

const presenceService = require("../services/presenceService");
const logger = require("../utils/logger");

function presenceHandler(io, socket) {
	const userId = socket.data.user.userId;

	// À la connexion : marquer en ligne
	presenceService.setOnline(userId, io).catch((error) => {
		logger.error("Error setting online on connect", {
			userId,
			error: error.message,
		});
	});

	// À la déconnexion : planifier le passage hors ligne (avec grâce)
	socket.on("disconnect", () => {
		// Vérifier s'il reste d'autres connexions actives pour cet utilisateur
		const room = io.sockets.adapter.rooms.get(`user:${userId}`);
		const hasOtherConnections = room && room.size > 0;

		// Ne passer offline que si plus aucune connexion active
		if (!hasOtherConnections) {
			presenceService.scheduleOffline(userId, io);
		}
	});
}

module.exports = presenceHandler;
