/**
 * Presence service - tracks user online/offline status with a grace period.
 * Uses Redis for real-time state and in-memory timers for the offline delay.
 */

const { getRedisClient } = require("../config/redis");
const User = require("../models/User");
const Contact = require("../models/Contact");
const logger = require("../utils/logger");

const OFFLINE_GRACE_PERIOD_MS = 10000; // 10 secondes

// Stocke les timers d'offline en attente (par userId)
const offlineTimers = new Map();

/**
 * Marque un utilisateur comme en ligne
 */
async function setOnline(userId, io) {
	const redis = getRedisClient();

	// Annuler tout timer d'offline en attente
	cancelOfflineSchedule(userId);

	// Marquer en ligne dans Redis
	await redis.set(`presence:${userId}`, "online");

	// Mettre à jour le statut dans MongoDB
	await User.findByIdAndUpdate(userId, {
		"presence.status": "online",
	});

	// Broadcaster aux contacts
	await broadcastPresence(userId, "online", null, io);

	logger.debug("User set online", { userId });
}

/**
 * Planifie le passage hors ligne après la période de grâce
 */
function scheduleOffline(userId, io) {
	// Annuler un timer existant si présent
	cancelOfflineSchedule(userId);

	const timer = setTimeout(async () => {
		try {
			const redis = getRedisClient();

			// Ne rien faire si le client Redis n'est plus connecté (ex: arrêt du serveur ou tests terminés)
			if (!redis.isOpen) {
				offlineTimers.delete(userId);
				return;
			}

			const lastSeen = new Date();

			await redis.del(`presence:${userId}`);

			await User.findByIdAndUpdate(userId, {
				"presence.status": "offline",
				"presence.lastSeen": lastSeen,
			});

			await broadcastPresence(userId, "offline", lastSeen, io);

			offlineTimers.delete(userId);

			logger.debug("User set offline", { userId });
		} catch (error) {
			logger.error("Error setting user offline", {
				userId,
				error: error.message,
			});
		}
	}, OFFLINE_GRACE_PERIOD_MS);

	// unref() permet au process de se terminer sans attendre ce timer (utile pour les tests)
	if (typeof timer.unref === "function") {
		timer.unref();
	}

	offlineTimers.set(userId, timer);
}

/**
 * Annule le passage hors ligne (reconnexion pendant la grâce)
 */
function cancelOfflineSchedule(userId) {
	const timer = offlineTimers.get(userId);
	if (timer) {
		clearTimeout(timer);
		offlineTimers.delete(userId);
	}
}

/**
 * Récupère le statut de présence d'un utilisateur
 */
async function getPresenceStatus(userId) {
	const redis = getRedisClient();
	const status = await redis.get(`presence:${userId}`);

	if (status === "online") {
		return { status: "online", lastSeen: null };
	}

	const user = await User.findById(userId).select("presence");
	return {
		status: "offline",
		lastSeen: user?.presence?.lastSeen || null,
	};
}

/**
 * Broadcaste le changement de présence à tous les contacts de l'utilisateur
 */
async function broadcastPresence(userId, status, lastSeen, io) {
	// Trouver tous ceux qui ont cet utilisateur en contact
	const contacts = await Contact.find({ contactId: userId }).select("userId");

	for (const contact of contacts) {
		io.to(`user:${contact.userId.toString()}`).emit("presence_change", {
			userId,
			status,
			lastSeen: lastSeen ? lastSeen.toISOString() : null,
		});
	}
}

/**
 * Annule tous les timers en attente (utile pour les tests)
 */
function clearAllTimers() {
	for (const timer of offlineTimers.values()) {
		clearTimeout(timer);
	}
	offlineTimers.clear();
}

module.exports = {
	setOnline,
	scheduleOffline,
	cancelOfflineSchedule,
	getPresenceStatus,
	clearAllTimers,
};
