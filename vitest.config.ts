import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

export default defineConfig({
	plugins: [react()],
	test: {
		environment: "happy-dom",
		globals: true,
		setupFiles: "./src/test/setup.ts",
		include: ["src/**/*.{test,spec}.{ts,tsx}"],
		coverage: {
			provider: "v8",
			reporter: ["text", "json", "html"],
			exclude: [
				"node_modules/",
				"src/test/",
				"*.config.ts",
				"src/env.js",
				"src/trpc/",
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