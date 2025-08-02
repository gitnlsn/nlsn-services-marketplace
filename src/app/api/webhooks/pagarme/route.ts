import crypto from "node:crypto";
import { type NextRequest, NextResponse } from "next/server";
import { env } from "~/env";
import { db } from "~/server/db";

// Pagarme webhook event types
interface PagarmeWebhookEvent {
	id: string;
	type: string;
	created_at: string;
	data: {
		id: string;
		status: string;
		amount: number;
		paid_amount?: number;
		refunded_amount?: number;
		order?: {
			id: string;
		};
		customer?: {
			id: string;
			email: string;
		};
	};
}

// Verify webhook signature
function verifyWebhookSignature(payload: string, signature: string): boolean {
	const expectedSignature = crypto
		.createHmac("sha256", env.PAGARME_SECRET_KEY)
		.update(payload)
		.digest("hex");

	return crypto.timingSafeEqual(
		Buffer.from(signature),
		Buffer.from(expectedSignature),
	);
}

export async function POST(request: NextRequest) {
	try {
		const body = await request.text();
		const signature = request.headers.get("x-hub-signature-256");

		// Verify webhook signature
		if (!signature || !verifyWebhookSignature(body, signature)) {
			return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
		}

		const event: PagarmeWebhookEvent = JSON.parse(body);

		console.log("Received Pagarme webhook:", event.type, event.data.id);

		// Handle different event types
		switch (event.type) {
			case "charge.paid":
				await handleChargePaid(event.data);
				break;

			case "charge.payment_failed":
				await handlePaymentFailed(event.data);
				break;

			case "charge.refunded":
				await handleChargeRefunded(event.data);
				break;

			case "charge.partial_refunded":
				await handleChargePartialRefunded(event.data);
				break;

			default:
				console.log(`Unhandled webhook event type: ${event.type}`);
		}

		return NextResponse.json({ received: true }, { status: 200 });
	} catch (error) {
		console.error("Webhook processing error:", error);
		return NextResponse.json(
			{ error: "Webhook processing failed" },
			{ status: 500 },
		);
	}
}

async function handleChargePaid(data: PagarmeWebhookEvent["data"]) {
	const payment = await db.payment.findFirst({
		where: { paymentGatewayId: data.id },
		include: {
			booking: {
				include: {
					service: true,
					provider: true,
					client: true,
				},
			},
		},
	});

	if (!payment) {
		console.error(`Payment not found for charge ${data.id}`);
		return;
	}

	// Update payment status
	await db.payment.update({
		where: { id: payment.id },
		data: {
			status: "paid",
			updatedAt: new Date(),
		},
	});

	// Set escrow release date (15 days from now)
	const escrowReleaseDate = new Date();
	escrowReleaseDate.setDate(escrowReleaseDate.getDate() + 15);

	await db.payment.update({
		where: { id: payment.id },
		data: {
			escrowReleaseDate,
		},
	});

	// Create notifications
	await db.$transaction([
		// Notify provider about payment
		db.notification.create({
			data: {
				userId: payment.booking.provider.id,
				type: "payment_received",
				title: "Payment Received",
				message: `Payment confirmed for ${payment.booking.service.title}`,
			},
		}),
		// Notify client about payment confirmation
		db.notification.create({
			data: {
				userId: payment.booking.client.id,
				type: "payment_confirmed",
				title: "Payment Confirmed",
				message: `Your payment for ${payment.booking.service.title} has been confirmed`,
			},
		}),
	]);
}

async function handlePaymentFailed(data: PagarmeWebhookEvent["data"]) {
	const payment = await db.payment.findFirst({
		where: { paymentGatewayId: data.id },
		include: {
			booking: {
				include: {
					service: true,
					client: true,
				},
			},
		},
	});

	if (!payment) {
		console.error(`Payment not found for charge ${data.id}`);
		return;
	}

	// Update payment status
	await db.payment.update({
		where: { id: payment.id },
		data: {
			status: "failed",
			updatedAt: new Date(),
		},
	});

	// Update booking status to cancelled
	await db.booking.update({
		where: { id: payment.bookingId },
		data: {
			status: "cancelled",
			cancellationReason: "Payment failed",
			cancelledBy: "system",
		},
	});

	// Notify client about payment failure
	await db.notification.create({
		data: {
			userId: payment.booking.client.id,
			type: "payment_failed",
			title: "Payment Failed",
			message: `Your payment for ${payment.booking.service.title} could not be processed. Please try again.`,
		},
	});

	// Decrement service booking count
	await db.service.update({
		where: { id: payment.booking.serviceId },
		data: { bookingCount: { decrement: 1 } },
	});
}

async function handleChargeRefunded(data: PagarmeWebhookEvent["data"]) {
	const payment = await db.payment.findFirst({
		where: { paymentGatewayId: data.id },
		include: {
			booking: {
				include: {
					service: true,
					client: true,
					provider: true,
				},
			},
		},
	});

	if (!payment) {
		console.error(`Payment not found for charge ${data.id}`);
		return;
	}

	// Update payment with refund info
	await db.payment.update({
		where: { id: payment.id },
		data: {
			status: "refunded",
			refundAmount: data.refunded_amount
				? data.refunded_amount / 100
				: payment.amount,
			refundedAt: new Date(),
			updatedAt: new Date(),
		},
	});

	// Create notifications
	await db.$transaction([
		// Notify client about refund
		db.notification.create({
			data: {
				userId: payment.booking.client.id,
				type: "refund_completed",
				title: "Refund Completed",
				message: `Your refund for ${payment.booking.service.title} has been processed`,
			},
		}),
		// Notify provider about refund
		db.notification.create({
			data: {
				userId: payment.booking.provider.id,
				type: "booking_refunded",
				title: "Booking Refunded",
				message: `The payment for ${payment.booking.service.title} has been refunded`,
			},
		}),
	]);
}

async function handleChargePartialRefunded(data: PagarmeWebhookEvent["data"]) {
	const payment = await db.payment.findFirst({
		where: { paymentGatewayId: data.id },
		include: {
			booking: {
				include: {
					service: true,
					client: true,
				},
			},
		},
	});

	if (!payment) {
		console.error(`Payment not found for charge ${data.id}`);
		return;
	}

	// Update payment with partial refund info
	await db.payment.update({
		where: { id: payment.id },
		data: {
			refundAmount: data.refunded_amount ? data.refunded_amount / 100 : 0,
			refundedAt: new Date(),
			updatedAt: new Date(),
		},
	});

	// Notify client about partial refund
	await db.notification.create({
		data: {
			userId: payment.booking.client.id,
			type: "partial_refund_completed",
			title: "Partial Refund Completed",
			message: `A partial refund for ${payment.booking.service.title} has been processed`,
		},
	});
}
