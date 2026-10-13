/** @type {import('jest').Config} */
export default {
	testEnvironment: "node",
	extensionsToTreatAsEsm: [".ts"],
	moduleNameMapper: {
		"^(\\.{1,2}/.*)\\.js$": "$1",
	},
	// minimal: swc 仅做转译（target 对齐 tsconfig ES2020），类型检查由 `pnpm typecheck`（typescript@7）承担；ts-jest 官方支持 TS7 后可评估迁回
	transform: {
		"^.+\\.tsx?$": ["@swc/jest", { jsc: { target: "es2020" } }],
	},
	testMatch: ["**/src/**/*.test.ts"],
	testPathIgnorePatterns: ["/node_modules/", "/build/"],
	clearMocks: true,
	restoreMocks: true,
	resetMocks: true,
	moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
	resolver: undefined,
};
