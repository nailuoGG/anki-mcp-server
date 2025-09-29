import { defineConfig } from "tsup";

export default defineConfig({
	entry: ["src/index.ts"],
	format: ["esm", "cjs"],
	clean: true,
	dts: false,
	target: "node16",
	splitting: false,
	sourcemap: false,
	minify: true,
	shims: true,
	inject: [],
	esbuildOptions(options) {
		options.resolveExtensions = [".ts", ".tsx", ".js", ".jsx"];
	},
	env: {
		NODE_ENV: process.env.NODE_ENV || "development",
	},
});
