import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
	plugins: [react()],
	test: {
		globals: true,
		environment: "node",
		setupFiles: "./setupTests.ts",
		coverage: {
			provider: "v8",
			reporter: ["text", "json", "html"],
			exclude: [
				"node_modules/",
				"prisma/",
				"scripts/",
				".next/",
				"src/env.js",
				"src/server/",
			],
		},
	},
});
