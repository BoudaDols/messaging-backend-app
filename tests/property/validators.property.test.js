const fc = require("fast-check");
const {
	validateEmail,
	validatePassword,
	validateDisplayName,
} = require("../../src/utils/validators");

describe("Property: Email validation", () => {
	it("should always reject strings without @", () => {
		fc.assert(
			fc.property(
				fc.string().filter((s) => !s.includes("@")),
				(input) => {
					const result = validateEmail(input);
					return result.valid === false;
				},
			),
			{ numRuns: 100 },
		);
	});

	it("should always accept format: string@string.string", () => {
		fc.assert(
			fc.property(
				fc.tuple(
					fc
						.string({ minLength: 1 })
						.filter((s) => !s.includes("@") && !s.includes(" ")),
					fc
						.string({ minLength: 1 })
						.filter(
							(s) => !s.includes("@") && !s.includes(" ") && !s.includes("."),
						),
					fc
						.string({ minLength: 1 })
						.filter((s) => !s.includes("@") && !s.includes(" ")),
				),
				([local, domain, tld]) => {
					const email = `${local}@${domain}.${tld}`;
					const result = validateEmail(email);
					return result.valid === true;
				},
			),
			{ numRuns: 100 },
		);
	});
});

describe("Property: Password length validation", () => {
	it("should reject any password shorter than 8 characters", () => {
		fc.assert(
			fc.property(fc.string({ maxLength: 7 }), (input) => {
				const result = validatePassword(input);
				return result.valid === false;
			}),
			{ numRuns: 100 },
		);
	});

	it("should reject any password longer than 128 characters", () => {
		fc.assert(
			fc.property(fc.string({ minLength: 129, maxLength: 200 }), (input) => {
				const result = validatePassword(input);
				return result.valid === false;
			}),
			{ numRuns: 100 },
		);
	});
});

describe("Property: Display name validation", () => {
	it("should reject any string with only whitespace", () => {
		fc.assert(
			fc.property(fc.integer({ min: 1, max: 50 }), (length) => {
				const input = " ".repeat(length);
				const result = validateDisplayName(input);
				return result.valid === false;
			}),
			{ numRuns: 100 },
		);
	});

	it("should reject any string longer than 50 characters", () => {
		fc.assert(
			fc.property(fc.string({ minLength: 51, maxLength: 100 }), (input) => {
				const result = validateDisplayName(input);
				return result.valid === false;
			}),
			{ numRuns: 100 },
		);
	});
});
