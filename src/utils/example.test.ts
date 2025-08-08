import { describe, expect, it } from "vitest";

describe("Example Test", () => {
	it("should pass basic arithmetic test", () => {
		expect(2 + 2).toBe(4);
	});

	it("should handle strings", () => {
		const message = "Hello, World!";
		expect(message).toContain("World");
	});
});
