import axios from "axios";
import { z } from "zod";
import { env } from "../../env.js";

// Pagarme API configuration
const PAGARME_API_URL = "https://api.pagar.me/core/v5";
const authHeader = `Basic ${Buffer.from(`${env.PAGARME_SECRET_KEY}:`).toString("base64")}`;

// Configure axios instance
const pagarmeApi = axios.create({
	baseURL: PAGARME_API_URL,
	headers: {
		"Content-Type": "application/json",
		Authorization: authHeader,
	},
	timeout: 60000,
});

// Validation schemas
export const createCheckoutLinkSchema = z.object({
	amount: z.number().positive(),
	description: z.string(),
	customerName: z.string(),
	customerEmail: z.string().email(),
	customerPhone: z.string().optional(),
	customerDocument: z.string().optional(), // CPF/CNPJ
	expiresInSeconds: z.number().default(86400), // 24 hours default
	successUrl: z.string().url(),
	metadata: z.record(z.any()).optional(),
});

export type CreateCheckoutLinkInput = z.infer<typeof createCheckoutLinkSchema>;

export interface CheckoutLinkResponse {
	orderId: string;
	checkoutUrl: string;
	expiresAt: Date;
}

export class PagarmeService {
	/**
	 * Creates a checkout link for payment processing
	 */
	async createCheckoutLink(
		input: CreateCheckoutLinkInput,
	): Promise<CheckoutLinkResponse> {
		const validatedInput = createCheckoutLinkSchema.parse(input);

		try {
			// Create payment link using direct API call
			const response = await pagarmeApi.post("/paymentlinks", {
				amount: validatedInput.amount,
				description: validatedInput.description,
				expires_in: validatedInput.expiresInSeconds,
				success_url: validatedInput.successUrl,
				accepted_payment_methods: ["credit_card", "pix", "boleto"],
				customer: {
					name: validatedInput.customerName,
					email: validatedInput.customerEmail,
					...(validatedInput.customerPhone && {
						phone: validatedInput.customerPhone,
					}),
					...(validatedInput.customerDocument && {
						document: validatedInput.customerDocument,
					}),
				},
				...(validatedInput.metadata && {
					metadata: validatedInput.metadata,
				}),
			});

			const paymentLink = response.data;

			if (!paymentLink.url) {
				throw new Error("No payment URL returned from Pagarme");
			}

			return {
				orderId: paymentLink.id || "",
				checkoutUrl: paymentLink.url,
				expiresAt: new Date(
					Date.now() + validatedInput.expiresInSeconds * 1000,
				),
			};
		} catch (error) {
			console.error("Pagarme API Error:", error);

			if (axios.isAxiosError(error)) {
				const message = error.response?.data?.message || error.message;
				throw new Error(`Failed to create checkout link: ${message}`);
			}

			if (error instanceof Error) {
				throw new Error(`Failed to create checkout link: ${error.message}`);
			}

			throw new Error("Failed to create checkout link");
		}
	}

	/**
	 * Retrieves order details by ID
	 */
	async getPaymentLink(linkId: string) {
		try {
			const response = await pagarmeApi.get(`/paymentlinks/${linkId}`);
			return response.data;
		} catch (error) {
			console.error("Failed to get payment link:", error);

			if (axios.isAxiosError(error)) {
				const message = error.response?.data?.message || error.message;
				throw new Error(`Failed to retrieve payment link: ${message}`);
			}

			throw new Error("Failed to retrieve payment link details");
		}
	}

	/**
	 * Validates webhook signature (for security)
	 */
	validateWebhookSignature(payload: string, signature: string): boolean {
		// TODO: Implement webhook signature validation
		// This would use HMAC-SHA256 with a webhook secret
		return true; // Placeholder
	}
}

// Export singleton instance
export const pagarmeService = new PagarmeService();
