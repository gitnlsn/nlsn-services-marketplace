// Mock types for Pagarme SDK (package not installed)
class ApiError extends Error {}

type ApiResponse<T> = {
	data: T;
	result?: {
		id?: string;
		status?: string;
		charges?: Array<{
			id?: string;
			status?: string;
			qrCode?: string;
			boletoDetails?: {
				url?: string;
			};
		}>;
	};
};

type Customer = {
	id?: string;
	name: string;
	email: string;
	document?: string;
	phones?: {
		homePhone?: { areaCode: string; number: string };
		mobilePhone?: { areaCode: string; number: string };
	};
};

type CustomerPhones = {
	homePhone?: { areaCode: string; number: string };
	mobilePhone?: { areaCode: string; number: string };
};

type CreateOrderRequest = {
	customer: Customer;
	code: string;
	closed: boolean;
	customerId?: string;
	items: Array<{
		code: string;
		amount: number;
		description: string;
		quantity: number;
	}>;
	payments: Array<{
		paymentMethod: string;
		creditCard?: {
			installments: number;
			card: {
				number: string;
				holderName: string;
				expMonth: number;
				expYear: number;
				cvv: string;
				billingAddress: unknown;
			};
		};
		pix?: {
			expiresIn: number;
		};
		boleto?: {
			bank: string;
			instructions: string;
			dueAt: string;
			documentNumber: string;
		};
	}>;
};

type GetTransactionResponse = {
	id?: string;
	status?: string;
	qrCode?: string;
	boletoDetails?: {
		url?: string;
	};
};

// Mock Pagarme SDK classes
class OrdersController {
	constructor(private config: unknown) {}
	createOrder(_data: CreateOrderRequest): Promise<ApiResponse<unknown>> {
		throw new Error("Pagarme SDK not installed");
	}
	getOrder(_id: string): Promise<ApiResponse<GetTransactionResponse>> {
		throw new Error("Pagarme SDK not installed");
	}
}

class PagarmeApiSDK {
	ordersController = new OrdersController(null);
}
import { env } from "~/env";

interface PaymentServiceConfig {
	apiKey: string;
	isProduction?: boolean;
}

interface BasePaymentData {
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

interface CreditCardPaymentData extends BasePaymentData {
	card: {
		number: string;
		holderName: string;
		expiryMonth: string;
		expiryYear: string;
		cvv: string;
	};
	installments?: number;
}

interface PaymentResult {
	transactionId: string;
	status: "pending" | "paid" | "failed";
	pixCode?: string;
	pixQrCode?: string;
	pixExpiresAt?: Date;
	boletoUrl?: string;
	boletoBarcode?: string;
	boletoDueDate?: Date;
}

export class PaymentService {
	private client: PagarmeApiSDK;
	private ordersController: OrdersController;

	constructor(config: PaymentServiceConfig) {
		this.client = new PagarmeApiSDK();
		this.ordersController = new OrdersController(this.client);
	}

	async processCreditCard(data: CreditCardPaymentData): Promise<PaymentResult> {
		try {
			const customer = this.createCustomer(data.customer);

			const request: CreateOrderRequest = {
				customer: customer,
				code: data.orderId,
				closed: false,
				customerId: customer.id,
				items: [
					{
						code: data.orderId,
						amount: data.amount,
						description: data.description,
						quantity: 1,
					},
				],
				payments: [
					{
						paymentMethod: "credit_card",
						creditCard: {
							installments: data.installments || 1,
							card: {
								number: data.card.number.replace(/\s/g, ""),
								holderName: data.card.holderName,
								expMonth: Number.parseInt(data.card.expiryMonth),
								expYear: Number.parseInt(`20${data.card.expiryYear}`),
								cvv: data.card.cvv,
								billingAddress: this.formatAddress(data.customer.address),
							},
						},
					},
				],
			};

			const response = await this.ordersController.createOrder(request);

			if (!response.result) {
				throw new Error("No response from payment gateway");
			}

			const charge = response.result.charges?.[0];
			if (!charge) {
				throw new Error("No charge created");
			}

			return {
				transactionId: charge.id || "unknown",
				status: this.mapStatus(charge.status || "pending"),
			};
		} catch (error) {
			console.error("Credit card payment error:", error);
			if (error instanceof ApiError) {
				throw new Error(`Payment failed: ${error.message}`);
			}
			throw new Error(
				`Payment failed: ${error instanceof Error ? error.message : "Unknown error"}`,
			);
		}
	}

	async generatePix(data: BasePaymentData): Promise<PaymentResult> {
		try {
			const customer = this.createCustomer(data.customer);

			const request: CreateOrderRequest = {
				customer: customer,
				code: data.orderId,
				closed: false,
				customerId: customer.id,
				items: [
					{
						code: data.orderId,
						amount: data.amount,
						description: data.description,
						quantity: 1,
					},
				],
				payments: [
					{
						paymentMethod: "pix",
						pix: {
							expiresIn: 3600, // 1 hour
						},
					},
				],
			};

			const response = await this.ordersController.createOrder(request);

			if (!response.result) {
				throw new Error("No response from payment gateway");
			}

			const charge = response.result.charges?.[0];
			if (!charge) {
				throw new Error("No charge created");
			}

			const pixData = charge?.qrCode;
			const pixExpiresAt = new Date();
			pixExpiresAt.setHours(pixExpiresAt.getHours() + 1);

			return {
				transactionId: charge.id || "unknown",
				status: "pending",
				pixCode: pixData,
				pixQrCode: pixData,
				pixExpiresAt,
			};
		} catch (error) {
			console.error("PIX payment error:", error);
			if (error instanceof ApiError) {
				throw new Error(`Payment failed: ${error.message}`);
			}
			throw new Error(
				`Payment failed: ${error instanceof Error ? error.message : "Unknown error"}`,
			);
		}
	}

	async generateBoleto(data: BasePaymentData): Promise<PaymentResult> {
		try {
			const customer = this.createCustomer(data.customer);

			// Due date is 3 days from now
			const dueDate = new Date();
			dueDate.setDate(dueDate.getDate() + 3);

			const request: CreateOrderRequest = {
				customer: customer,
				code: data.orderId,
				closed: false,
				customerId: customer.id,
				items: [
					{
						code: data.orderId,
						amount: data.amount,
						description: data.description,
						quantity: 1,
					},
				],
				payments: [
					{
						paymentMethod: "boleto",
						boleto: {
							bank: "237", // Bradesco
							instructions: "Pagamento referente a serviço contratado",
							dueAt: dueDate.toISOString(),
							documentNumber: data.orderId.substring(0, 11),
						},
					},
				],
			};

			const response = await this.ordersController.createOrder(request);

			if (!response.result) {
				throw new Error("No response from payment gateway");
			}

			const charge = response.result.charges?.[0];
			if (!charge) {
				throw new Error("No charge created");
			}

			const boletoData = charge?.boletoDetails;

			return {
				transactionId: charge.id || "unknown",
				status: "pending",
				boletoUrl: boletoData?.url,
				boletoBarcode: boletoData?.url, // Using URL as placeholder
				boletoDueDate: dueDate,
			};
		} catch (error) {
			console.error("Boleto payment error:", error);
			if (error instanceof ApiError) {
				throw new Error(`Payment failed: ${error.message}`);
			}
			throw new Error(
				`Payment failed: ${error instanceof Error ? error.message : "Unknown error"}`,
			);
		}
	}

	async checkPaymentStatus(transactionId: string): Promise<{ status: string }> {
		try {
			const response = await this.ordersController.getOrder(transactionId);

			if (!response.result) {
				throw new Error("Transaction not found");
			}

			const charge = response.result.charges?.[0];
			if (!charge) {
				throw new Error("No charge found");
			}

			return {
				status: this.mapStatus(charge.status || "pending"),
			};
		} catch (error) {
			console.error("Status check error:", error);
			throw error;
		}
	}

	async processRefund(data: {
		transactionId: string;
		amount: number;
		reason: string;
	}): Promise<{ refundId: string }> {
		try {
			// In real implementation, this would call Pagarme's refund endpoint
			// For now, we'll simulate it
			console.log("Processing refund:", data);

			// Simulated refund ID
			const refundId = `refund_${Date.now()}`;

			return { refundId };
		} catch (error) {
			console.error("Refund error:", error);
			throw error;
		}
	}

	private createCustomer(customerData: BasePaymentData["customer"]): Customer {
		const phones: CustomerPhones = {};
		if (customerData.phone) {
			phones.mobilePhone = {
				areaCode: customerData.phone.substring(0, 2),
				number: customerData.phone.substring(2),
			};
		}

		return {
			id: `customer_${Date.now()}`,
			name: customerData.name,
			email: customerData.email,
			document: customerData.cpf,
			phones,
		};
	}

	private formatAddress(address: BasePaymentData["customer"]["address"]) {
		return {
			street: address.street,
			number: address.number,
			complement: address.complement,
			neighborhood: address.neighborhood,
			city: address.city,
			state: address.state,
			zipCode: address.zipCode.replace(/\D/g, ""),
			country: "BR",
		};
	}

	private mapStatus(pagarmeStatus: string): "pending" | "paid" | "failed" {
		switch (pagarmeStatus) {
			case "paid":
			case "captured":
				return "paid";
			case "pending":
			case "processing":
			case "waiting_payment":
				return "pending";
			default:
				return "failed";
		}
	}
}

export function createPaymentService(): PaymentService {
	return new PaymentService({
		apiKey: env.PAGARME_SECRET_KEY,
		isProduction: env.NODE_ENV === "production",
	});
}
