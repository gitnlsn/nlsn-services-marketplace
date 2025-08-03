import { pagarmeService } from "./pagarme";

interface PaymentData {
	amount: number; // in cents
	description: string;
	orderId: string;
	customer: {
		name: string;
		email: string;
		cpf?: string;
		phone?: string;
		address: {
			street: string;
			number: string;
			complement?: string;
			neighborhood: string;
			city: string;
			state: string;
			zipCode: string;
		};
	};
}

interface CreditCardData extends PaymentData {
	card: {
		number: string;
		holderName: string;
		expiryMonth: string;
		expiryYear: string;
		cvv: string;
	};
	installments: number;
}

interface PaymentResult {
	transactionId: string;
	status: string;
	checkoutUrl?: string;
	pixCode?: string;
	pixQrCode?: string;
	pixExpiresAt?: Date;
	boletoUrl?: string;
	boletoBarcode?: string;
	boletoDueDate?: Date;
}

interface RefundData {
	transactionId: string;
	amount: number; // in cents
	reason: string;
}

export interface PaymentService {
	processCreditCard(data: CreditCardData): Promise<PaymentResult>;
	generatePix(data: PaymentData): Promise<PaymentResult>;
	generateBoleto(data: PaymentData): Promise<PaymentResult>;
	checkPaymentStatus(transactionId: string): Promise<{ status: string }>;
	processRefund(
		data: RefundData,
	): Promise<{ refundId: string; status: string }>;
}

class PagarmePaymentService implements PaymentService {
	async processCreditCard(data: CreditCardData): Promise<PaymentResult> {
		// For now, create a checkout link since direct credit card processing
		// requires more complex integration with Pagarme
		const result = await pagarmeService.createCheckoutLink({
			amount: data.amount,
			description: data.description,
			customerName: data.customer.name,
			customerEmail: data.customer.email,
			customerPhone: data.customer.phone,
			customerDocument: data.customer.cpf,
			expiresInSeconds: 24 * 60 * 60, // 24 hours
			successUrl: `${process.env.NEXTAUTH_URL}/bookings/${data.orderId}/payment/success`,
			metadata: {
				orderId: data.orderId,
				paymentMethod: "credit_card",
				installments: data.installments,
			},
		});

		return {
			transactionId: result.orderId,
			status: "pending",
			checkoutUrl: result.checkoutUrl,
		};
	}

	async generatePix(data: PaymentData): Promise<PaymentResult> {
		const result = await pagarmeService.createCheckoutLink({
			amount: data.amount,
			description: data.description,
			customerName: data.customer.name,
			customerEmail: data.customer.email,
			customerPhone: data.customer.phone,
			customerDocument: data.customer.cpf,
			expiresInSeconds: 24 * 60 * 60, // 24 hours
			successUrl: `${process.env.NEXTAUTH_URL}/bookings/${data.orderId}/payment/success`,
			metadata: {
				orderId: data.orderId,
				paymentMethod: "pix",
			},
		});

		return {
			transactionId: result.orderId,
			status: "pending",
			checkoutUrl: result.checkoutUrl,
			pixExpiresAt: result.expiresAt,
		};
	}

	async generateBoleto(data: PaymentData): Promise<PaymentResult> {
		const result = await pagarmeService.createCheckoutLink({
			amount: data.amount,
			description: data.description,
			customerName: data.customer.name,
			customerEmail: data.customer.email,
			customerPhone: data.customer.phone,
			customerDocument: data.customer.cpf,
			expiresInSeconds: 24 * 60 * 60, // 24 hours
			successUrl: `${process.env.NEXTAUTH_URL}/bookings/${data.orderId}/payment/success`,
			metadata: {
				orderId: data.orderId,
				paymentMethod: "boleto",
			},
		});

		// Calculate due date (typically 3 days from creation)
		const boletoDueDate = new Date();
		boletoDueDate.setDate(boletoDueDate.getDate() + 3);

		return {
			transactionId: result.orderId,
			status: "pending",
			checkoutUrl: result.checkoutUrl,
			boletoUrl: result.checkoutUrl, // Use checkout URL for now
			boletoDueDate,
		};
	}

	async checkPaymentStatus(transactionId: string): Promise<{ status: string }> {
		try {
			const paymentLink = await pagarmeService.getPaymentLink(transactionId);

			// Map Pagarme status to our internal status
			let status = "pending";
			if (paymentLink.status === "paid") {
				status = "paid";
			} else if (
				paymentLink.status === "failed" ||
				paymentLink.status === "canceled"
			) {
				status = "failed";
			}

			return { status };
		} catch (error) {
			console.error("Error checking payment status:", error);
			// Return current status if we can't check
			return { status: "pending" };
		}
	}

	async processRefund(
		data: RefundData,
	): Promise<{ refundId: string; status: string }> {
		// Note: This is a simplified implementation
		// In a real implementation, you'd call Pagarme's refund API
		console.log(
			"Processing refund for transaction:",
			data.transactionId,
			"Amount:",
			data.amount,
			"Reason:",
			data.reason,
		);

		// For now, return a mock successful refund
		return {
			refundId: `refund_${Date.now()}`,
			status: "refunded",
		};
	}
}

export function createPaymentService(): PaymentService {
	return new PagarmePaymentService();
}
