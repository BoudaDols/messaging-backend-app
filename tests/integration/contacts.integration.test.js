const request = require("supertest");
const mongoose = require("mongoose");
const { createClient } = require("redis");
const app = require("../../app");

let redisClient;
let tokenA;
let userAId;
let userBId;

beforeAll(async () => {
	const dbUrl =
		process.env.DB_URL || "mongodb://localhost:27017/messaging-platform-test";
	await mongoose.connect(dbUrl);

	const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
	redisClient = createClient({ url: redisUrl });
	await redisClient.connect();

	const { setRedisClient } = require("../../src/config/redis");
	setRedisClient(redisClient);

	// Créer User A
	const resA = await request(app)
		.post("/api/auth/register")
		.send({ email: "usera@example.com", password: "MyPass123!" });
	tokenA = resA.body.token;
	userAId = resA.body.user.id;

	// Créer User B
	const resB = await request(app)
		.post("/api/auth/register")
		.send({ email: "userb@example.com", password: "MyPass123!" });
	userBId = resB.body.user.id;
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

describe("POST /api/contacts", () => {
	afterEach(async () => {
		// Nettoie les contacts entre les tests
		const Contact = require("../../src/models/Contact");
		await Contact.deleteMany({});
	});

	it("should add a contact", async () => {
		const res = await request(app)
			.post("/api/contacts")
			.set("Authorization", `Bearer ${tokenA}`)
			.send({ contactId: userBId });

		expect(res.status).toBe(201);
		expect(res.body.message).toBe("Contact added successfully");
		expect(res.body.contacts.length).toBe(1);
		expect(res.body.contacts[0].id).toBe(userBId);
	});

	it("should reject duplicate contact with 409", async () => {
		// Ajouter une première fois
		await request(app)
			.post("/api/contacts")
			.set("Authorization", `Bearer ${tokenA}`)
			.send({ contactId: userBId });

		// Ajouter une deuxième fois
		const res = await request(app)
			.post("/api/contacts")
			.set("Authorization", `Bearer ${tokenA}`)
			.send({ contactId: userBId });

		expect(res.status).toBe(409);
		expect(res.body.error.code).toBe("CONFLICT");
	});

	it("should reject adding self as contact", async () => {
		const res = await request(app)
			.post("/api/contacts")
			.set("Authorization", `Bearer ${tokenA}`)
			.send({ contactId: userAId });

		expect(res.status).toBe(409);
	});

	it("should reject non-existent user", async () => {
		const fakeId = new mongoose.Types.ObjectId();
		const res = await request(app)
			.post("/api/contacts")
			.set("Authorization", `Bearer ${tokenA}`)
			.send({ contactId: fakeId.toString() });

		expect(res.status).toBe(404);
	});
});

describe("GET /api/contacts", () => {
	beforeAll(async () => {
		// Ajouter un contact pour les tests de listing
		await request(app)
			.post("/api/contacts")
			.set("Authorization", `Bearer ${tokenA}`)
			.send({ contactId: userBId });
	});

	it("should return contact list", async () => {
		const res = await request(app)
			.get("/api/contacts")
			.set("Authorization", `Bearer ${tokenA}`);

		expect(res.status).toBe(200);
		expect(res.body.contacts.length).toBe(1);
		expect(res.body.contacts[0].email).toBe("userb@example.com");
	});

	it("should return contacts sorted alphabetically", async () => {
		// Créer User C avec un nom qui vient avant "userb"
		const resC = await request(app)
			.post("/api/auth/register")
			.send({ email: "anna@example.com", password: "MyPass123!" });

		await request(app)
			.post("/api/contacts")
			.set("Authorization", `Bearer ${tokenA}`)
			.send({ contactId: resC.body.user.id });

		const res = await request(app)
			.get("/api/contacts")
			.set("Authorization", `Bearer ${tokenA}`);

		expect(res.status).toBe(200);
		expect(res.body.contacts.length).toBe(2);
		// "anna" vient avant "userb" alphabétiquement
		expect(res.body.contacts[0].displayName).toBe("anna");
		expect(res.body.contacts[1].displayName).toBe("userb");
	});
});

describe("DELETE /api/contacts/:userId", () => {
	it("should remove a contact", async () => {
		const res = await request(app)
			.delete(`/api/contacts/${userBId}`)
			.set("Authorization", `Bearer ${tokenA}`);

		expect(res.status).toBe(200);
		expect(res.body.message).toBe("Contact removed successfully");
	});

	it("should return 404 for non-existent contact", async () => {
		const fakeId = new mongoose.Types.ObjectId();
		const res = await request(app)
			.delete(`/api/contacts/${fakeId}`)
			.set("Authorization", `Bearer ${tokenA}`);

		expect(res.status).toBe(404);
	});
});