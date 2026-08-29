/**
 * Manual test script for WebSocket real-time messaging.
 *
 * Usage:
 *   1. Make sure the server is running (docker-compose up)
 *   2. Run: node scripts/testWebSocket.js
 *
 * This script:
 *   - Registers/logs in two users (Alice and Bob)
 *   - Connects both via WebSocket
 *   - Alice sends a message to Bob
 *   - Verifies Bob receives it in real time
 *   - Tests typing indicators and read receipts
 */

const { io } = require("socket.io-client");

const API_URL = "http://localhost:3000";
const WS_URL = "http://localhost:3000";

// Génère des emails uniques pour éviter les conflits
const suffix = Date.now();
const ALICE = { email: `alice-${suffix}@test.com`, password: "MyPass123!" };
const BOB = { email: `bob-${suffix}@test.com`, password: "MyPass123!" };

/**
 * Enregistre un utilisateur et retourne son token + id
 */
async function registerUser(user) {
	const res = await fetch(`${API_URL}/api/auth/register`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(user),
	});
	const data = await res.json();
	if (!res.ok) {
		throw new Error(`Register failed: ${JSON.stringify(data)}`);
	}
	return { token: data.token, id: data.user.id };
}

/**
 * Connecte un utilisateur en WebSocket
 */
function connectSocket(name, token) {
	return new Promise((resolve, reject) => {
		const socket = io(WS_URL, {
			auth: { token },
			transports: ["websocket"],
		});

		socket.on("connect", () => {
			console.log(`✅ ${name} connected (socket ${socket.id})`);
			resolve(socket);
		});

		socket.on("connect_error", (err) => {
			reject(new Error(`${name} connection failed: ${err.message}`));
		});
	});
}

/**
 * Petite pause utilitaire
 */
function wait(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
	console.log("\n=== WebSocket Real-Time Test ===\n");

	// 1. Enregistrer les deux utilisateurs
	console.log("1. Registering users...");
	const alice = await registerUser(ALICE);
	const bob = await registerUser(BOB);
	console.log(`   Alice ID: ${alice.id}`);
	console.log(`   Bob ID:   ${bob.id}\n`);

	// 2. Connecter les deux en WebSocket
	console.log("2. Connecting WebSockets...");
	const aliceSocket = await connectSocket("Alice", alice.token);
	const bobSocket = await connectSocket("Bob", bob.token);
	console.log();

	// 3. Bob écoute les nouveaux messages
	bobSocket.on("new_message", (message) => {
		console.log("📨 Bob received a message in real time:");
		console.log(`   From: ${message.senderId}`);
		console.log(`   Content: "${message.content}"`);
		console.log(`   Status: ${message.deliveryStatus}\n`);

		// Bob marque le message comme lu
		console.log("4. Bob marks the message as read...");
		bobSocket.emit("message_read", { messageIds: [message._id] });
	});

	// 4. Alice écoute les accusés de lecture
	aliceSocket.on("read_receipt", (receipt) => {
		console.log("👁️  Alice received a read receipt:");
		console.log(`   Read by: ${receipt.readerId}`);
		console.log(`   Message IDs: ${receipt.messageIds.join(", ")}\n`);
	});

	// 5. Bob écoute les indicateurs de frappe
	bobSocket.on("typing_status", (status) => {
		if (status.isTyping) {
			console.log(
				`⌨️  Bob sees: ${status.displayName || "Someone"} is typing...\n`,
			);
		} else {
			console.log("⌨️  Bob sees: typing stopped\n");
		}
	});

	await wait(500);

	// 6. Alice envoie un message à Bob (avec acknowledgment)
	console.log("3. Alice sends a message to Bob...");
	aliceSocket.emit(
		"send_message",
		{
			recipientId: bob.id,
			content: "Salut Bob ! Ceci est un test temps réel 🚀",
		},
		(ack) => {
			if (ack.success) {
				console.log("   ✅ Server acknowledged the message:");
				console.log(`      Message ID: ${ack.messageId}`);
				console.log(`      Status: ${ack.status}\n`);
			} else {
				console.log(`   ❌ Send failed: ${ack.error}\n`);
			}
		},
	);

	// Laisser le temps aux événements de circuler
	await wait(2000);

	// 7. Nettoyer
	console.log("=== Test complete. Disconnecting. ===\n");
	aliceSocket.disconnect();
	bobSocket.disconnect();

	process.exit(0);
}

main().catch((error) => {
	console.error("Test failed:", error.message);
	process.exit(1);
});
