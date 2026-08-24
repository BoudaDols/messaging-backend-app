const request = require("supertest");
const mongoose = require("mongoose");
const { createClient } = require("redis");
const app = require("../../app");

let redisClient;
let token;
let userId;

beforeAll(async () => {
	const dbUrl =
		process.env.DB_URL || "mongodb://localhost:27017/messaging-platform-test";
	await mongoose.connect(dbUrl);

	const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
	redisClient = createClient({ url: redisUrl });
	await redisClient.connect();

	const { setRedisClient } = require("../../src/config/redis");
	setRedisClient(redisClient);

	// Créer un utilisateur et récupérer le token
	const res = await request(app)
		.post("/api/auth/register")
		.send({ email: "profileuser@example.com", password: "MyPass123!" });

	token = res.body.token;
	userId = res.body.user.id;
});

afterEach(async () => {
	// Ne PAS nettoyer ici car les tests dépendent de l'utilisateur créé dans beforeAll
});

afterAll(async () => {
	const collections = mongoose.connection.collections;
	for (const key in collections) {
		await collections[key].deleteMany({});
	}
	await redisClient.flushDb();
	await mongoose.connection.close();
	await redisClient.quit();
});

describe("PUT /api/users/profile", () => {
	it("should update display name", async () => {
		const res = await request(app)
			.put("/api/users/profile")
			.set("Authorization", `Bearer ${token}`)
			.send({ displayName: "New Name" });

		expect(res.status).toBe(200);
		expect(res.body.user.displayName).toBe("New Name");
	});

	it("should reject empty display name", async () => {
		const res = await request(app)
			.put("/api/users/profile")
			.set("Authorization", `Bearer ${token}`)
			.send({ displayName: "" });

		expect(res.status).toBe(400);
		expect(res.body.error.code).toBe("VALIDATION_ERROR");
	});

	it("should reject display name over 50 chars", async () => {
		const res = await request(app)
			.put("/api/users/profile")
			.set("Authorization", `Bearer ${token}`)
			.send({ displayName: "a".repeat(51) });

		expect(res.status).toBe(400);
	});

	it("should reject request without auth token", async () => {
		const res = await request(app)
			.put("/api/users/profile")
			.send({ displayName: "Test" });

		expect(res.status).toBe(401);
	});
});

describe("GET /api/users/:id/profile", () => {
	it("should return public profile", async () => {
		const res = await request(app)
			.get(`/api/users/${userId}/profile`)
			.set("Authorization", `Bearer ${token}`);

		expect(res.status).toBe(200);
		expect(res.body.user.displayName).toBeDefined();
		expect(res.body.user.presence).toBeDefined();
	});

	it("should return 404 for non-existent user", async () => {
		const fakeId = new mongoose.Types.ObjectId();
		const res = await request(app)
			.get(`/api/users/${fakeId}/profile`)
			.set("Authorization", `Bearer ${token}`);

		expect(res.status).toBe(404);
		expect(res.body.error.code).toBe("NOT_FOUND");
	});
});

describe("GET /api/users/search", () => {
	beforeAll(async () => {
		// Créer des utilisateurs à chercher
		await request(app)
			.post("/api/auth/register")
			.send({ email: "alice@example.com", password: "MyPass123!" });
		await request(app)
			.post("/api/auth/register")
			.send({ email: "bob@example.com", password: "MyPass123!" });
	});

	it("should find users by name", async () => {
		const res = await request(app)
			.get("/api/users/search?q=alice")
			.set("Authorization", `Bearer ${token}`);

		expect(res.status).toBe(200);
		expect(res.body.results.length).toBeGreaterThan(0);
		expect(res.body.results[0].email).toBe("alice@example.com");
	});

	it("should be case-insensitive", async () => {
		const res = await request(app)
			.get("/api/users/search?q=ALICE")
			.set("Authorization", `Bearer ${token}`);

		expect(res.status).toBe(200);
		expect(res.body.results.length).toBeGreaterThan(0);
	});

	it("should not include self in results", async () => {
		const res = await request(app)
			.get("/api/users/search?q=profileuser")
			.set("Authorization", `Bearer ${token}`);

		expect(res.status).toBe(200);
		const ids = res.body.results.map((r) => r.id);
		expect(ids).not.toContain(userId);
	});

	it("should reject query shorter than 2 chars", async () => {
		const res = await request(app)
			.get("/api/users/search?q=a")
			.set("Authorization", `Bearer ${token}`);

		expect(res.status).toBe(400);
	});

	it("should return max 20 results", async () => {
		const res = await request(app)
			.get("/api/users/search?q=example")
			.set("Authorization", `Bearer ${token}`);

		expect(res.status).toBe(200);
		expect(res.body.results.length).toBeLessThanOrEqual(20);
	});
});
