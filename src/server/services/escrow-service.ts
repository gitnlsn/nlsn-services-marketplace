import type { PrismaClient } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import type { Session } from "next-auth";
import { z } from "zod";
// Temporary stub implementations for escrow functions (TODO: implement properly)
const escrowService = {
	async getProviderEarnings(userId: string) {
		// Stub implementation
		return {
			totalEarnings: 0,
			availableBalance: 0,
			pendingEscrow: 0,
		};
	},

	async freezeEscrow(paymentId: string, reason: string, userId: string) {
		// Stub implementation - extend escrow release date
		// TODO: implement proper escrow freezing logic
		console.log(
			`Escrow frozen for payment ${paymentId} by user ${userId}: ${reason}`,
		);
	},

	async processWithdrawal(
		userId: string,
		amount: number,
		bankAccountId: string,
	) {
		// Stub implementation
		// TODO: implement proper withdrawal processing
		return `withdrawal_${Date.now()}`;
	},

	async getPaymentsReadyForRelease() {
		// Stub implementation
		// TODO: implement proper query for payments ready for release
		return [];
	},

	async processBulkRelease() {
		// Stub implementation
		// TODO: implement proper bulk release processing
		return {
			released: 0,
			errors: 0,
		};
	},
};

// Input schemas
export const getEarningsOverviewSchema = z.object({});

export const getEarningsHistorySchema = z.object({
	limit: z.number().min(1).max(100).default(20),
	cursor: z.string().cuid().optional(),
	status: z.enum(["all", "pending", "released", "disputed"]).default("all"),
});

export const requestEarlyReleaseSchema = z.object({
	paymentId: z.string().cuid(),
	reason: z.string().min(20).max(500),
});

export const disputePaymentSchema = z.object({
	paymentId: z.string().cuid(),
	reason: z.string().min(20).max(1000),
	category: z.enum([
		"service_not_completed",
		"poor_quality",
		"professional_no_show",
		"other",
	]),
});

export const getWithdrawalHistorySchema = z.object({
	limit: z.number().min(1).max(50).default(20),
	cursor: z.string().cuid().optional(),
});

export const requestWithdrawalSchema = z.object({
	amount: z.number().positive().max(10000), // Maximum R$ 10,000 per withdrawal
	bankAccountId: z.string().cuid(),
});

export const getPendingReleasesSchema = z.object({});

export const processEscrowReleasesSchema = z.object({});

export const getEscrowStatsSchema = z.object({});

// Service types
type GetEarningsOverviewInput = z.infer<typeof getEarningsOverviewSchema>;
type GetEarningsHistoryInput = z.infer<typeof getEarningsHistorySchema>;
type RequestEarlyReleaseInput = z.infer<typeof requestEarlyReleaseSchema>;
type DisputePaymentInput = z.infer<typeof disputePaymentSchema>;
type GetWithdrawalHistoryInput = z.infer<typeof getWithdrawalHistorySchema>;
type RequestWithdrawalInput = z.infer<typeof requestWithdrawalSchema>;
type GetPendingReleasesInput = z.infer<typeof getPendingReleasesSchema>;
type ProcessEscrowReleasesInput = z.infer<typeof processEscrowReleasesSchema>;
type GetEscrowStatsInput = z.infer<typeof getEscrowStatsSchema>;

export function createEscrowService({
	db,
	currentUser,
}: {
	db: PrismaClient;
	currentUser?: Session["user"];
}) {
	function checkProfessionalAccess() {
		if (!currentUser) {
			throw new TRPCError({
				code: "UNAUTHORIZED",
				message: "User not authenticated",
			});
		}
	}

	async function verifyUserIsProfessional(userId: string) {
		const user = await db.user.findUnique({
			where: { id: userId },
			select: { isProfessional: true },
		});

		if (!user?.isProfessional) {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: "Only professionals can access this feature",
			});
		}

		return user;
	}

	return {
		async getEarningsOverview(input: GetEarningsOverviewInput) {
			checkProfessionalAccess();
			const userId = currentUser?.id;

			if (!userId) {
				throw new TRPCError({
					code: "UNAUTHORIZED",
					message: "User not authenticated",
				});
			}

			await verifyUserIsProfessional(userId);
			return await escrowService.getProviderEarnings(userId);
		},

		async getEarningsHistory(input: GetEarningsHistoryInput) {
			checkProfessionalAccess();
			const userId = currentUser?.id;

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

			const payments = await db.payment.findMany({
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
		},

		async requestEarlyRelease(input: RequestEarlyReleaseInput) {
			checkProfessionalAccess();
			const userId = currentUser?.id;

			const payment = await db.payment.findUnique({
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
			await db.notification.create({
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
		},

		async disputePayment(input: DisputePaymentInput) {
			checkProfessionalAccess();
			const userId = currentUser?.id;

			const payment = await db.payment.findUnique({
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
		},

		async getWithdrawalHistory(input: GetWithdrawalHistoryInput) {
			checkProfessionalAccess();
			const userId = currentUser?.id;

			const withdrawals = await db.withdrawal.findMany({
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
		},

		async requestWithdrawal(input: RequestWithdrawalInput) {
			checkProfessionalAccess();
			const userId = currentUser?.id;

			if (!userId) {
				throw new TRPCError({
					code: "UNAUTHORIZED",
					message: "User not authenticated",
				});
			}

			await verifyUserIsProfessional(userId);

			const withdrawalId = await escrowService.processWithdrawal(
				userId,
				input.amount,
				input.bankAccountId,
			);

			return {
				withdrawalId,
				message: "Withdrawal request submitted successfully",
			};
		},

		async getPendingReleases(input: GetPendingReleasesInput) {
			checkProfessionalAccess();
			// In a real app, this would require admin privileges
			// For now, we'll allow any authenticated user to see this data

			const paymentsReadyForRelease =
				await escrowService.getPaymentsReadyForRelease();

			return {
				count: paymentsReadyForRelease.length,
				totalAmount: paymentsReadyForRelease.reduce(
					(sum: number, payment: { netAmount: number }) =>
						sum + payment.netAmount,
					0,
				),
				payments: paymentsReadyForRelease.slice(0, 10), // Return first 10 for preview
			};
		},

		async processEscrowReleases(input: ProcessEscrowReleasesInput) {
			checkProfessionalAccess();
			// In a real app, this would require admin privileges
			// For now, we'll allow it for testing purposes

			const result = await escrowService.processBulkRelease();

			return {
				message: `Processed escrow releases: ${result.released} successful, ${result.errors} errors`,
				...result,
			};
		},

		async getEscrowStats(input: GetEscrowStatsInput) {
			checkProfessionalAccess();

			const [totalEscrow, readyForRelease, totalReleased] = await Promise.all([
				// Total amount in escrow
				db.payment.aggregate({
					where: {
						status: "paid",
						releasedAt: null,
					},
					_sum: {
						netAmount: true,
					},
				}),

				// Amount ready for release
				db.payment.aggregate({
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
				db.payment.aggregate({
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
		},
	};
}
