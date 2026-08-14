const {
	validateEmail,
	validatePassword,
	validateDisplayName,
} = require("../../src/utils/validators");

describe("validateEmail", () => {
	it("should accept a valid email", () => {
		const result = validateEmail("user@example.com");
		expect(result.valid).toBe(true);
	});

	it("should reject email without @", () => {
		const result = validateEmail("userexample.com");
		expect(result.valid).toBe(false);
	});

	it("should reject email without domain dot", () => {
		const result = validateEmail("user@example");
		expect(result.valid).toBe(false);
	});

	it("should reject empty email", () => {
		const result = validateEmail("");
		expect(result.valid).toBe(false);
	});

	it("should reject null", () => {
		const result = validateEmail(null);
		expect(result.valid).toBe(false);
	});
});

describe("validatePassword", () => {
	it("should accept a strong password (8+ chars, upper, lower, number, special)", () => {
		const result = validatePassword("MyPass123!");
		expect(result.valid).toBe(true);
	});

	it("should reject password shorter than 8 characters", () => {
		const result = validatePassword("Ab1!");
		expect(result.valid).toBe(false);
	});

	it("should reject password longer than 128 characters", () => {
		const long = `A1!${"a".repeat(126)}`;
		const result = validatePassword(long);
		expect(result.valid).toBe(false);
	});

	it("should reject password without uppercase", () => {
		const result = validatePassword("mypass123!");
		expect(result.valid).toBe(false);
	});

	it("should reject password without number", () => {
		const result = validatePassword("MyPassAbc!");
		expect(result.valid).toBe(false);
	});

	it("should reject empty password", () => {
		const result = validatePassword("");
		expect(result.valid).toBe(false);
	});
});

describe("validateDisplayName", () => {
	it("should accept a valid display name", () => {
		const result = validateDisplayName("John");
		expect(result.valid).toBe(true);
	});

	it("should reject empty string", () => {
		const result = validateDisplayName("");
		expect(result.valid).toBe(false);
	});

	it("should reject whitespace only", () => {
		const result = validateDisplayName("   ");
		expect(result.valid).toBe(false);
	});

	it("should reject name longer than 50 characters", () => {
		const result = validateDisplayName("a".repeat(51));
		expect(result.valid).toBe(false);
	});

	it("should accept name with spaces in between", () => {
		const result = validateDisplayName("John Doe");
		expect(result.valid).toBe(true);
	});
});
