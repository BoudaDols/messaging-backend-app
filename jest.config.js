module.exports = {
	testEnvironment: "node",
	testMatch: ["**/tests/**/*.test.js"],
	coverageDirectory: "coverage",
	collectCoverageFrom: [
		"src/**/*.js",
		"!src/config/database.js",
		"!src/config/redis.js",
	],
	transformIgnorePatterns: ["/node_modules/(?!uuid)/"],
};
