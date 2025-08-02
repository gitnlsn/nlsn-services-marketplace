import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
	plugins: [react()],
	resolve: {
		alias: {
			"~": resolve(__dirname, "./src"),
		},
	},
	test: {
		globals: true,
		environment: "node",
		setupFiles: ["./src/test/setup.ts"],
		testTimeout: 30000,
		hookTimeout: 30000,
		exclude: [
			"**/node_modules/**",
			"**/dist/**",
			"**/.next/**",
			"**/coverage/**",
		],
		coverage: {
			provider: "v8",
			reporter: ["text", "json", "html"],
			exclude: [
				"node_modules/",
				"src/test/",
				"**/*.d.ts",
				"**/*.config.*",
				"**/coverage/**",
				"**/.next/**",
				"prisma/",
				"scripts/",
				"src/env.js",
			],
		},
	},
});
