import { config } from "dotenv";
import { describe, expect, it, vi } from "vitest";

// Load environment variables before importing the service
config();

// Mock env module to avoid validation errors in test
vi.mock("../../env.js", () => ({
	env: {
		PAGARME_SECRET_KEY:
			process.env.PAGARME_SECRET_KEY || "sk_test_YOUR_SECRET_KEY_HERE",
		PAGARME_PUBLIC_KEY: process.env.PAGARME_PUBLIC_KEY || "",
	},
}));

// Import service after mocking
const { pagarmeService } = await import("../server/services/pagarme");

describe("Pagarme Integration Tests", () => {
	it("should create a checkout link successfully", async () => {
		// Skip test if no API key is configured
		if (
			!process.env.PAGARME_SECRET_KEY ||
			process.env.PAGARME_SECRET_KEY.includes("YOUR_SECRET_KEY_HERE")
		) {
			console.warn(
				"⚠️  Skipping Pagarme integration test - No valid API key configured",
			);
			console.warn(
				"   To run this test, add a valid test API key to your .env file:",
			);
			console.warn("   PAGARME_SECRET_KEY=sk_test_YOUR_ACTUAL_KEY");
			return;
		}

		// Test data
		const testInput = {
			amount: 10000, // R$ 100.00 in cents
			description: "Test Service - Integration Test",
			customerName: "Test Customer",
			customerEmail: "test@example.com",
			customerPhone: "11999999999",
			customerDocument: "12345678901", // Test CPF
			expiresInSeconds: 3600, // 1 hour
			successUrl: "https://example.com/success",
			metadata: {
				test: true,
				serviceId: "test-123",
				bookingId: "booking-456",
			},
		};

		try {
			// Create checkout link
			const result = await pagarmeService.createCheckoutLink(testInput);

			// Validate response
			expect(result).toBeDefined();
			expect(result.orderId).toBeDefined();
			expect(result.orderId).toMatch(/^or_/); // Pagarme order IDs start with 'or_'

			expect(result.checkoutUrl).toBeDefined();
			expect(result.checkoutUrl).toMatch(/^https:\/\//); // Should be a valid HTTPS URL
			expect(result.checkoutUrl).toContain("pagar.me"); // Should be a Pagarme URL

			expect(result.expiresAt).toBeDefined();
			expect(result.expiresAt).toBeInstanceOf(Date);
			expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now());

			console.log("✅ Checkout link created successfully!");
			console.log("   Order ID:", result.orderId);
			console.log("   Checkout URL:", result.checkoutUrl);
			console.log("   Expires at:", result.expiresAt.toISOString());

			// Optionally retrieve the payment link to verify it exists
			const paymentLink = await pagarmeService.getPaymentLink(result.orderId);
			expect(paymentLink).toBeDefined();
			expect(paymentLink.id).toBe(result.orderId);
			expect(paymentLink.amount).toBe(testInput.amount);

			console.log("✅ Payment link retrieved successfully!");
			console.log("   ID:", paymentLink.id);
			console.log("   Amount:", paymentLink.amount);
		} catch (error) {
			// If error contains "401" or "authentication", it's likely an API key issue
			if (
				error instanceof Error &&
				(error.message.includes("401") ||
					error.message.includes("authentication"))
			) {
				console.error(
					"❌ Authentication failed - Check your PAGARME_SECRET_KEY in .env",
				);
				console.error(
					"   Make sure you're using a valid test API key from Pagarme dashboard",
				);
			}
			throw error;
		}
	}, 30000); // 30 second timeout for API calls

	it("should validate input data", async () => {
		// Test missing required fields
		await expect(
			pagarmeService.createCheckoutLink({
				amount: -100, // Invalid negative amount
				description: "",
				customerName: "",
				customerEmail: "invalid-email", // Invalid email
				successUrl: "not-a-url", // Invalid URL
				expiresInSeconds: 86400,
			}),
		).rejects.toThrow();
	});
});

// Run this test file directly with: npm test src/test/pagarme-integration.test.ts
