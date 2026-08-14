const mongoose = require("mongoose");
const { createClient } = require("redis");

let redisClient;

// Connecte MongoDB et Redis avant les tests
beforeAll(async () => {
	const dbUrl =
		process.env.DB_URL || "mongodb://localhost:27017/messaging-platform-test";
	await mongoose.connect(dbUrl);

	const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
	redisClient = createClient({ url: redisUrl });
	await redisClient.connect();

	// Rendre le client Redis accessible globalement pour les tests
	global.__REDIS_CLIENT__ = redisClient;
});

// Nettoie la DB entre chaque test
afterEache(async () => {
	const collections = mongoose.connection.collections;
	for (const key in collections) {
		await collections[key].deleteMany({});
	}
	// Nettoie Redis
	await redisClient.flushDb();
});

// Ferme les connections apres les tests
afterAll(async () => {
	await mongoose.connection.close();
	await redisClient.quit();
});
