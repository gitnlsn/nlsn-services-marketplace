import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
	test: {
		name: "backend",
		environment: "node",
		globals: true,
		setupFiles: "./src/test/setup.backend.ts",
		include: [
			"src/server/**/*.{test,spec}.{ts,tsx}",
			"src/utils/**/*.{test,spec}.{ts,tsx}",
		],
		coverage: {
			provider: "v8",
			reporter: ["text", "json", "html"],
			exclude: [
				"node_modules/",
				"src/test/",
				"*.config.ts",
				"src/env.js",
				"src/server/db.ts",
			],
		},
	},
	resolve: {
		alias: {
			"~": resolve(__dirname, "./src"),
		},
	},
});