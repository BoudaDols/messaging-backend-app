const { validateDisplayName } = require("../../src/utils/validators");

describe("Display Name Validation", () => {
	it("should accept valid display name", () => {
		expect(validateDisplayName("John Doe").valid).toBe(true);
	});

	it("should accept single character", () => {
		expect(validateDisplayName("J").valid).toBe(true);
	});

	it("should accept 50 characters", () => {
		expect(validateDisplayName("a".repeat(50)).valid).toBe(true);
	});

	it("should reject empty string", () => {
		expect(validateDisplayName("").valid).toBe(false);
	});

	it("should reject only spaces", () => {
		expect(validateDisplayName("   ").valid).toBe(false);
	});

	it("should reject more than 50 characters", () => {
		expect(validateDisplayName("a".repeat(51)).valid).toBe(false);
	});

	it("should reject null", () => {
		expect(validateDisplayName(null).valid).toBe(false);
	});

	it("should reject undefined", () => {
		expect(validateDisplayName(undefined).valid).toBe(false);
	});

	it("should accept name with leading/trailing spaces (trimming is done elsewhere)", () => {
		expect(validateDisplayName(" John ").valid).toBe(true);
	});
});
