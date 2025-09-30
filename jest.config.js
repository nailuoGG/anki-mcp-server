/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
	preset: "ts-jest",
	testEnvironment: "node",
	extensionsToTreatAsEsm: [".ts"],
	moduleNameMapper: {
		"^(\\.{1,2}/.*)\\.js$": "$1",
	},
	transform: {
		"^.+\\.tsx?$": [
			"ts-jest",
			{
				useESM: true,
			},
		],
	},
	testMatch: ["**/src/**/*.test.ts"],
	testPathIgnorePatterns: ["/node_modules/", "/build/"],
	clearMocks: true,
	restoreMocks: true,
	resetMocks: true,
	moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
	resolver: undefined,
};
