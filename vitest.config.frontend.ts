import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

export default defineConfig({
	plugins: [react()],
	test: {
		name: "frontend",
		environment: "happy-dom",
		globals: true,
		setupFiles: "./src/test/setup.frontend.ts",
		include: [
			"src/app/**/*.{test,spec}.{ts,tsx}",
			"src/components/**/*.{test,spec}.{ts,tsx}",
			"src/hooks/**/*.{test,spec}.{ts,tsx}",
		],
		coverage: {
			provider: "v8",
			reporter: ["text", "json", "html"],
			exclude: [
				"node_modules/",
				"src/test/",
				"*.config.ts",
				"src/env.js",
			],
		},
	},
	resolve: {
		alias: {
			"~": resolve(__dirname, "./src"),
		},
	},
});