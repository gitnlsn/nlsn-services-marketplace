import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { escrowService } from "~/server/services/escrow";

export const escrowRouter = createTRPCRouter({
	// Get provider's earnings overview
	getEarningsOverview: protectedProcedure.query(async ({ ctx }) => {
		const userId = ctx.session.user.id;

		// Verify user is a professional
		const user = await ctx.db.user.findUnique({
			where: { id: userId },
			select: { isProfessional: true },
		});

		if (!user?.isProfessional) {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: "Only professionals can view earnings",
			});
		}

		return await escrowService.getProviderEarnings(userId);
	}),

	// Get detailed earnings breakdown
	getEarningsHistory: protectedProcedure
		.input(
			z.object({
				limit: z.number().min(1).max(100).default(20),
				cursor: z.string().cuid().optional(),
				status: z
					.enum(["all", "pending", "released", "disputed"])
					.default("all"),
			}),
		)
		.query(async ({ ctx, input }) => {
			const userId = ctx.session.user.id;

			// Build where clause based on status filter
			let paymentStatusFilter = {};
			switch (input.status) {
				case "pending":
					paymentStatusFilter = {
						status: "paid",
						releasedAt: null,
						escrowReleaseDate: { gt: new Date() },
					};
					break;
				case "released":
					paymentStatusFilter = {
						status: "paid",
						releasedAt: { not: null },
					};
					break;
				case "disputed":
					paymentStatusFilter = {
						status: "paid",
						releasedAt: null,
						escrowReleaseDate: {
							gt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
						}, // Extended release dates indicate disputes
					};
					break;
				default:
					paymentStatusFilter = { status: "paid" };
			}

			const payments = await ctx.db.payment.findMany({
				where: {
					booking: {
						providerId: userId,
					},
					...paymentStatusFilter,
					...(input.cursor && {
						id: { lt: input.cursor },
					}),
				},
				include: {
					booking: {
						include: {
							service: {
								select: { title: true },
							},
							client: {
								select: { name: true, image: true },
							},
						},
					},
				},
				orderBy: { createdAt: "desc" },
				take: input.limit + 1,
			});

			let nextCursor: typeof input.cursor | undefined = undefined;
			if (payments.length > input.limit) {
				const nextItem = payments.pop();
				nextCursor = nextItem?.id;
			}

			return {
				payments: payments.map((payment) => ({
					id: payment.id,
					amount: payment.amount,
					netAmount: payment.netAmount,
					serviceFee: payment.serviceFee,
					status: payment.releasedAt ? "released" : "pending",
					escrowReleaseDate: payment.escrowReleaseDate,
					releasedAt: payment.releasedAt,
					createdAt: payment.createdAt,
					booking: {
						id: payment.booking.id,
						service: payment.booking.service,
						client: payment.booking.client,
					},
				})),
				nextCursor,
			};
		}),

	// Request early escrow release (for disputes or special cases)
	requestEarlyRelease: protectedProcedure
		.input(
			z.object({
				paymentId: z.string().cuid(),
				reason: z.string().min(20).max(500),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.session.user.id;

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

			if (payment.booking.providerId !== userId) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "You can only request early release for your own payments",
				});
			}

			if (payment.releasedAt) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Payment has already been released",
				});
			}

			if (payment.booking.status !== "completed") {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Booking must be completed to request early release",
				});
			}

			// Create a notification for admin review
			await ctx.db.notification.create({
				data: {
					userId: "system", // This would be an admin user in practice
					type: "early_release_request",
					title: "Early Release Request",
					message: `Professional ${userId} requested early release for payment ${input.paymentId}: ${input.reason}`,
				},
			});

			return {
				success: true,
				message: "Early release request submitted for review",
			};
		}),

	// Dispute a payment (for clients)
	disputePayment: protectedProcedure
		.input(
			z.object({
				paymentId: z.string().cuid(),
				reason: z.string().min(20).max(1000),
				category: z.enum([
					"service_not_completed",
					"poor_quality",
					"professional_no_show",
					"other",
				]),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.session.user.id;

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

			if (payment.booking.clientId !== userId) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "You can only dispute your own payments",
				});
			}

			if (payment.releasedAt) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Cannot dispute payment - funds already released",
				});
			}

			if (payment.status !== "paid") {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Can only dispute paid payments",
				});
			}

			// Check if already disputed (extended escrow period)
			const now = new Date();
			const originalReleaseDate = new Date(payment.createdAt);
			originalReleaseDate.setDate(originalReleaseDate.getDate() + 15);

			if (
				payment.escrowReleaseDate &&
				payment.escrowReleaseDate > originalReleaseDate
			) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "This payment is already under dispute",
				});
			}

			await escrowService.freezeEscrow(input.paymentId, input.reason, userId);

			return { success: true, message: "Payment dispute submitted for review" };
		}),

	// Get withdrawal history
	getWithdrawalHistory: protectedProcedure
		.input(
			z.object({
				limit: z.number().min(1).max(50).default(20),
				cursor: z.string().cuid().optional(),
			}),
		)
		.query(async ({ ctx, input }) => {
			const userId = ctx.session.user.id;

			const withdrawals = await ctx.db.withdrawal.findMany({
				where: {
					userId,
					...(input.cursor && {
						id: { lt: input.cursor },
					}),
				},
				orderBy: { createdAt: "desc" },
				take: input.limit + 1,
			});

			let nextCursor: typeof input.cursor | undefined = undefined;
			if (withdrawals.length > input.limit) {
				const nextItem = withdrawals.pop();
				nextCursor = nextItem?.id;
			}

			return {
				withdrawals: withdrawals.map((withdrawal) => ({
					id: withdrawal.id,
					amount: withdrawal.amount,
					status: withdrawal.status,
					createdAt: withdrawal.createdAt,
					updatedAt: withdrawal.updatedAt,
				})),
				nextCursor,
			};
		}),

	// Request withdrawal
	requestWithdrawal: protectedProcedure
		.input(
			z.object({
				amount: z.number().positive().max(10000), // Maximum R$ 10,000 per withdrawal
				bankAccountId: z.string().cuid(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.session.user.id;

			// Verify user is a professional
			const user = await ctx.db.user.findUnique({
				where: { id: userId },
				select: { isProfessional: true },
			});

			if (!user?.isProfessional) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Only professionals can request withdrawals",
				});
			}

			const withdrawalId = await escrowService.processWithdrawal(
				userId,
				input.amount,
				input.bankAccountId,
			);

			return {
				withdrawalId,
				message: "Withdrawal request submitted successfully",
			};
		}),

	// Get pending escrow releases (admin only - for cron jobs)
	getPendingReleases: protectedProcedure.query(async ({ ctx }) => {
		// In a real app, this would require admin privileges
		// For now, we'll allow any authenticated user to see this data

		const paymentsReadyForRelease =
			await escrowService.getPaymentsReadyForRelease();

		return {
			count: paymentsReadyForRelease.length,
			totalAmount: paymentsReadyForRelease.reduce(
				(sum, payment) => sum + payment.netAmount,
				0,
			),
			payments: paymentsReadyForRelease.slice(0, 10), // Return first 10 for preview
		};
	}),

	// Process escrow releases (admin only - typically called by cron)
	processEscrowReleases: protectedProcedure.mutation(async ({ ctx }) => {
		// In a real app, this would require admin privileges
		// For now, we'll allow it for testing purposes

		const result = await escrowService.processBulkRelease();

		return {
			message: `Processed escrow releases: ${result.released} successful, ${result.errors} errors`,
			...result,
		};
	}),

	// Get escrow statistics (for dashboard)
	getEscrowStats: protectedProcedure.query(async ({ ctx }) => {
		const [totalEscrow, readyForRelease, totalReleased] = await Promise.all([
			// Total amount in escrow
			ctx.db.payment.aggregate({
				where: {
					status: "paid",
					releasedAt: null,
				},
				_sum: {
					netAmount: true,
				},
			}),

			// Amount ready for release
			ctx.db.payment.aggregate({
				where: {
					status: "paid",
					releasedAt: null,
					escrowReleaseDate: {
						lte: new Date(),
					},
					booking: {
						status: "completed",
					},
				},
				_sum: {
					netAmount: true,
				},
			}),

			// Total amount released to date
			ctx.db.payment.aggregate({
				where: {
					status: "paid",
					releasedAt: { not: null },
				},
				_sum: {
					netAmount: true,
				},
			}),
		]);

		return {
			totalInEscrow: totalEscrow._sum.netAmount || 0,
			readyForRelease: readyForRelease._sum.netAmount || 0,
			totalReleased: totalReleased._sum.netAmount || 0,
		};
	}),
});
