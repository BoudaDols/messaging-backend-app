const request = require("supertest");
const mongoose = require("mongoose");
const { createClient } = require("redis");
const app = require("../../app");

let redisClient;

beforeAll(async () => {
	// Connect a la DB test
	const dbUrl =
		process.env.DB_URL || "mongodb://localhost:27017/messaging-platform-test";
	await mongoose.connect(dbUrl);

	// Connecte Redis
	const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
	redisClient = createClient({ url: redisUrl });
	await redisClient.connect();

	// Injecter le client Redis dans le module pour que authService l'utilise
	const { setRedisClient } = require("../../src/config/redis");
	setRedisClient(redisClient);
});

afterEach(async () => {
	// Nettoie entre chaque test
	const collections = mongoose.connection.collections;
	for (const key in collections) {
		await collections[key].deleteMany({});
	}
	await redisClient.flushDb();
});

afterAll(async () => {
	await mongoose.connection.close();
	await redisClient.quit();
});

describe("POST /api/auth/register", () => {
	it("should register a new user and return token", async () => {
		const res = await request(app)
			.post("/api/auth/register")
			.send({ email: "test@example.com", password: "MyPass123!" });

		expect(res.status).toBe(201);
		expect(res.body.message).toBe("User registered successfully");
		expect(res.body.user.email).toBe("test@example.com");
		expect(res.body.user.displayName).toBe("test");
		expect(res.body.token).toBeDefined();
	});

	it("should reject duplicate email with 409", async () => {
		//Premier enregistrement
		await request(app)
			.post("/api/auth/register")
			.send({ email: "test@example.com", password: "MyPass123!" });

		//deuxieme enregistrement. A rejeter
		const res = await request(app)
			.post("/api/auth/register")
			.send({ email: "test@example.com", password: "MyPass123!" });

		expect(res.status).toBe(409);
		expect(res.body.error.code).toBe("CONFLICT");
	});

	it("should reject invalid email with 400", async () => {
		const res = await request(app)
			.post("/api/auth/register")
			.send({ email: "not-an-email", passowrd: "MyPass123!" });

		expect(res.status).toBe(400);
		expect(res.body.error.code).toBe("VALIDATION_ERROR");
	});

	it("should reject weak password with 400", async () => {
		const res = await request(app)
			.post("/api/auth/register")
			.send({ email: "user@example.com", password: "weak" });

		expect(res.status).toBe(400);
		expect(res.body.error.code).toBe("VALIDATION_ERROR");
	});

	it("should reject missing fields with 400", async () => {
		const res = await request(app).post("/api/auth/register").send({});

		expect(res.status).toBe(400);
	});
});

describe("POST /api/auth/login", () => {
	beforeEach(async () => {
		// Créer un user pour les tests de login
		await request(app)
			.post("/api/auth/register")
			.send({ email: "user@example.com", password: "MyPass123!" });
	});

	it("should be login with valid credentials", async () => {
		const res = await request(app)
			.post("/api/auth/login")
			.send({ email: "user@example.com", password: "MyPass123!" });

		expect(res.status).toBe(200);
		expect(res.body.message).toBe("Login successful");
		expect(res.body.user.email).toBe("user@example.com");
		expect(res.body.token).toBeDefined();
	});

	it("should reject wrong password with 401", async () => {
		const res = await request(app)
			.post("/api/auth/login")
			.send({ email: "user@example.com", password: "WrongPass1!" });

		expect(res.status).toBe(401);
		expect(res.body.error.code).toBe("UNAUTHORIZED");
	});

	it("should reject non-existent email with 401", async () => {
		const res = await request(app)
			.post("/api/auth/login")
			.send({ email: "nobody@example.com", password: "MyPass123!" });

		expect(res.status).toBe(401);
		expect(res.body.error.code).toBe("UNAUTHORIZED");
	});

	it("should return identical error for wrong email and wrong password", async () => {
		const wrongEmail = await request(app)
			.post("/api/auth/login")
			.send({ email: "nobody@example.com", password: "MyPass123!" });

		const wrongPassword = await request(app)
			.post("/api/auth/login")
			.send({ email: "user@example.com", password: "WrongPass1!" });

		// Les deux doivent être identiques (sécurité)
		expect(wrongEmail.status).toBe(wrongPassword.status);
		expect(wrongEmail.body.error.code).toBe(wrongPassword.body.error.code);
		expect(wrongEmail.body.error.message).toBe(
			wrongPassword.body.error.message,
		);
	});

	it("should lock account after 5 failed attempts", async () => {
		// 5 tentatives échouées
		for (let i = 0; i < 5; i++) {
			await request(app)
				.post("/api/auth/login")
				.send({ email: "user@example.com", password: "WrongPass1!" });
		}

		// La 6ème devrait être bloquée
		const res = await request(app)
			.post("/api/auth/login")
			.send({ email: "user@example.com", password: "MyPass123!" });

		expect(res.status).toBe(429);
		expect(res.body.error.code).toBe("RATE_LIMITED");
	});
});
