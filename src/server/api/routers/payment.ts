import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { env } from "~/env";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { escrowService } from "~/server/services/escrow";
import { createPaymentService } from "~/server/services/payment";

const paymentMethodSchema = z.discriminatedUnion("type", [
	z.object({
		type: z.literal("credit_card"),
		cardNumber: z.string().regex(/^\d{13,19}$/),
		cardHolderName: z.string().min(1),
		expiryMonth: z.string().regex(/^(0[1-9]|1[0-2])$/),
		expiryYear: z.string().regex(/^\d{2}$/),
		cvv: z.string().regex(/^\d{3,4}$/),
		installments: z.number().min(1).max(12).default(1),
	}),
	z.object({
		type: z.literal("pix"),
	}),
	z.object({
		type: z.literal("boleto"),
		cpf: z.string().length(11),
		fullName: z.string().min(1),
	}),
]);

export const paymentRouter = createTRPCRouter({
	// Process payment for a booking
	processPayment: protectedProcedure
		.input(
			z.object({
				bookingId: z.string().cuid(),
				paymentMethod: paymentMethodSchema,
				billingAddress: z.object({
					street: z.string().min(1),
					number: z.string().min(1),
					complement: z.string().optional(),
					neighborhood: z.string().min(1),
					city: z.string().min(1),
					state: z.string().length(2),
					zipCode: z.string().length(8),
				}),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// Get booking with payment details
			const booking = await ctx.db.booking.findUnique({
				where: { id: input.bookingId },
				include: {
					payment: true,
					service: true,
					client: true,
				},
			});

			if (!booking) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Booking not found",
				});
			}

			// Verify booking belongs to user
			if (booking.clientId !== ctx.session.user.id) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "You don't have permission to pay for this booking",
				});
			}

			// Verify booking is in pending status
			if (booking.status !== "pending") {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Booking is not in pending status",
				});
			}

			// Verify payment exists and is pending
			if (!booking.payment || booking.payment.status !== "pending") {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "No pending payment found for this booking",
				});
			}

			const paymentService = createPaymentService();

			try {
				// Process payment based on method
				let paymentResult: {
					transactionId: string;
					status: string;
					checkoutUrl?: string;
					pixCode?: string;
					pixQrCode?: string;
					pixExpiresAt?: Date;
					boletoUrl?: string;
					boletoBarcode?: string;
					boletoDueDate?: Date;
				};
				const paymentData = {
					amount: Math.round(booking.payment.amount * 100), // Convert to cents
					description: `Booking for ${booking.service.title}`,
					orderId: booking.id,
					customer: {
						name: booking.client.name || "Customer",
						email: booking.client.email || "unknown@example.com",
						cpf:
							input.paymentMethod.type === "boleto"
								? input.paymentMethod.cpf
								: undefined,
						phone: booking.client.phone || undefined,
						address: input.billingAddress,
					},
				};

				switch (input.paymentMethod.type) {
					case "credit_card":
						paymentResult = await paymentService.processCreditCard({
							...paymentData,
							card: {
								number: input.paymentMethod.cardNumber,
								holderName: input.paymentMethod.cardHolderName,
								expiryMonth: input.paymentMethod.expiryMonth,
								expiryYear: input.paymentMethod.expiryYear,
								cvv: input.paymentMethod.cvv,
							},
							installments: input.paymentMethod.installments,
						});
						break;

					case "pix":
						paymentResult = await paymentService.generatePix(paymentData);
						break;

					case "boleto":
						paymentResult = await paymentService.generateBoleto({
							...paymentData,
							customer: {
								...paymentData.customer,
								name: input.paymentMethod.fullName,
								cpf: input.paymentMethod.cpf,
							},
						});
						break;
				}

				// Update payment record
				const updatedPayment = await ctx.db.payment.update({
					where: { id: booking.payment.id },
					data: {
						paymentMethod: input.paymentMethod.type,
						paymentGatewayId: paymentResult.transactionId,
						status: paymentResult.status === "paid" ? "paid" : "pending",
						pixCode: paymentResult.pixCode || null,
						pixQrCode: paymentResult.pixQrCode || null,
						pixExpiresAt: paymentResult.pixExpiresAt || null,
						boletoUrl: paymentResult.boletoUrl || null,
						boletoBarcode: paymentResult.boletoBarcode || null,
						boletoDueDate: paymentResult.boletoDueDate || null,
					},
				});

				// If payment was immediately approved (credit card), notify provider
				if (paymentResult.status === "paid") {
					await ctx.db.notification.create({
						data: {
							userId: booking.providerId,
							type: "payment_received",
							title: "Payment Received",
							message: `Payment received for booking of ${booking.service.title}`,
						},
					});
				}

				return {
					payment: updatedPayment,
					paymentResult,
				};
			} catch (error) {
				console.error("Payment processing error:", error);

				// Update payment status to failed
				await ctx.db.payment.update({
					where: { id: booking.payment.id },
					data: { status: "failed" },
				});

				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Payment processing failed. Please try again.",
				});
			}
		}),

	// Get payment status
	getPaymentStatus: protectedProcedure
		.input(
			z.object({
				paymentId: z.string().cuid(),
			}),
		)
		.query(async ({ ctx, input }) => {
			const payment = await ctx.db.payment.findUnique({
				where: { id: input.paymentId },
				include: {
					booking: {
						include: {
							client: true,
							provider: true,
						},
					},
				},
			});

			if (!payment) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Payment not found",
				});
			}

			// Verify user has access to this payment
			if (
				payment.booking.clientId !== ctx.session.user.id &&
				payment.booking.providerId !== ctx.session.user.id
			) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "You don't have permission to view this payment",
				});
			}

			// Check with payment gateway for latest status if pending
			if (payment.status === "pending" && payment.paymentGatewayId) {
				const paymentService = createPaymentService();
				const gatewayStatus = await paymentService.checkPaymentStatus(
					payment.paymentGatewayId,
				);

				// Update local status if changed
				if (gatewayStatus.status !== payment.status) {
					const updatedPayment = await ctx.db.payment.update({
						where: { id: payment.id },
						data: { status: gatewayStatus.status },
					});

					// Send notifications if payment was approved
					if (gatewayStatus.status === "paid") {
						await ctx.db.notification.create({
							data: {
								userId: payment.booking.providerId,
								type: "payment_received",
								title: "Payment Received",
								message: "Payment received for your service",
							},
						});
					}

					return updatedPayment;
				}
			}

			return payment;
		}),

	// Request refund (for cancelled bookings)
	requestRefund: protectedProcedure
		.input(
			z.object({
				paymentId: z.string().cuid(),
				reason: z.string().min(10),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const payment = await ctx.db.payment.findUnique({
				where: { id: input.paymentId },
				include: {
					booking: {
						include: {
							service: true,
						},
					},
				},
			});

			if (!payment) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Payment not found",
				});
			}

			// Verify user is the client
			if (payment.booking.clientId !== ctx.session.user.id) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Only the client can request a refund",
				});
			}

			// Verify booking is cancelled
			if (payment.booking.status !== "cancelled") {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Booking must be cancelled to request a refund",
				});
			}

			// Verify payment is eligible for refund
			if (payment.status !== "paid") {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Payment is not eligible for refund",
				});
			}

			// Calculate refund amount based on cancellation policy
			const hoursUntilService =
				(payment.booking.bookingDate.getTime() - Date.now()) / (1000 * 60 * 60);
			let refundPercentage = 1.0; // 100% refund

			if (hoursUntilService < 24) {
				refundPercentage = 0.5; // 50% refund if cancelled within 24 hours
			}
			if (hoursUntilService < 2) {
				refundPercentage = 0; // No refund if cancelled within 2 hours
			}

			const refundAmount = payment.amount * refundPercentage;

			if (refundAmount === 0) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Booking cancelled too close to service time for refund",
				});
			}

			// Process refund with payment gateway
			const paymentService = createPaymentService();
			try {
				const refundResult = await paymentService.processRefund({
					transactionId: payment.paymentGatewayId || "",
					amount: Math.round(refundAmount * 100), // Convert to cents
					reason: input.reason,
				});

				// Update payment record
				const updatedPayment = await ctx.db.payment.update({
					where: { id: payment.id },
					data: {
						status: "refunded",
						refundAmount,
						refundedAt: new Date(),
					},
				});

				// Create notifications
				await ctx.db.$transaction([
					ctx.db.notification.create({
						data: {
							userId: payment.booking.clientId,
							type: "refund_processed",
							title: "Refund Processed",
							message: `Your refund of R$ ${refundAmount.toFixed(2)} has been processed`,
						},
					}),
					ctx.db.notification.create({
						data: {
							userId: payment.booking.providerId,
							type: "booking_refunded",
							title: "Booking Refunded",
							message: `Booking for ${payment.booking.service.title} was refunded`,
						},
					}),
				]);

				return updatedPayment;
			} catch (error) {
				console.error("Refund processing error:", error);
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Refund processing failed. Please contact support.",
				});
			}
		}),

	// Release escrow funds (automated, called by cron job)
	releaseEscrowFunds: protectedProcedure
		.input(
			z.object({
				paymentId: z.string().cuid(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// This should be called by a system/admin user or cron job
			// For now, we'll allow it to be called manually for testing

			const payment = await ctx.db.payment.findUnique({
				where: { id: input.paymentId },
				include: {
					booking: {
						include: {
							provider: true,
						},
					},
				},
			});

			if (!payment) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Payment not found",
				});
			}

			// Verify payment is eligible for escrow release
			if (payment.status !== "paid") {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Payment is not in paid status",
				});
			}

			if (payment.booking.status !== "completed") {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Booking must be completed to release funds",
				});
			}

			if (
				!payment.escrowReleaseDate ||
				payment.escrowReleaseDate > new Date()
			) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Escrow release date has not been reached",
				});
			}

			if (payment.releasedAt) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Funds have already been released",
				});
			}

			// Update payment to mark funds as released
			const updatedPayment = await ctx.db.payment.update({
				where: { id: payment.id },
				data: {
					releasedAt: new Date(),
				},
			});

			// Update provider's account balance
			await ctx.db.user.update({
				where: { id: payment.booking.provider.id },
				data: {
					accountBalance: {
						increment: payment.netAmount,
					},
				},
			});

			// Create notification for provider
			await ctx.db.notification.create({
				data: {
					userId: payment.booking.provider.id,
					type: "funds_available",
					title: "Funds Available",
					message: `R$ ${payment.netAmount.toFixed(2)} is now available for withdrawal`,
				},
			});

			return updatedPayment;
		}),
});
