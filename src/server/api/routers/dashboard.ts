import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const dashboardRouter = createTRPCRouter({
	// Get professional dashboard overview
	getOverview: protectedProcedure.query(async ({ ctx }) => {
		// Verify user is professional
		const user = await ctx.db.user.findUnique({
			where: { id: ctx.session.user.id },
		});

		if (!user?.isProfessional) {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: "Only professionals can access dashboard",
			});
		}

		// Get current date ranges
		const now = new Date();
		const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
		const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
		const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

		// Get booking statistics
		const [
			totalBookings,
			thisMonthBookings,
			lastMonthBookings,
			pendingBookings,
			completedBookings,
		] = await Promise.all([
			ctx.db.booking.count({
				where: { providerId: ctx.session.user.id },
			}),
			ctx.db.booking.count({
				where: {
					providerId: ctx.session.user.id,
					createdAt: { gte: startOfMonth },
				},
			}),
			ctx.db.booking.count({
				where: {
					providerId: ctx.session.user.id,
					createdAt: {
						gte: startOfLastMonth,
						lte: endOfLastMonth,
					},
				},
			}),
			ctx.db.booking.count({
				where: {
					providerId: ctx.session.user.id,
					status: "pending",
				},
			}),
			ctx.db.booking.count({
				where: {
					providerId: ctx.session.user.id,
					status: "completed",
				},
			}),
		]);

		// Get earnings statistics
		const [thisMonthEarnings, lastMonthEarnings, totalEarnings] =
			await Promise.all([
				ctx.db.payment.aggregate({
					where: {
						booking: {
							providerId: ctx.session.user.id,
							completedAt: { gte: startOfMonth },
						},
						status: "paid",
					},
					_sum: { netAmount: true },
				}),
				ctx.db.payment.aggregate({
					where: {
						booking: {
							providerId: ctx.session.user.id,
							completedAt: {
								gte: startOfLastMonth,
								lte: endOfLastMonth,
							},
						},
						status: "paid",
					},
					_sum: { netAmount: true },
				}),
				ctx.db.payment.aggregate({
					where: {
						booking: { providerId: ctx.session.user.id },
						status: "paid",
						releasedAt: { not: null },
					},
					_sum: { netAmount: true },
				}),
			]);

		// Get service statistics
		const [activeServices, totalServices] = await Promise.all([
			ctx.db.service.count({
				where: {
					providerId: ctx.session.user.id,
					status: "active",
				},
			}),
			ctx.db.service.count({
				where: { providerId: ctx.session.user.id },
			}),
		]);

		// Get recent bookings
		const recentBookings = await ctx.db.booking.findMany({
			where: { providerId: ctx.session.user.id },
			take: 5,
			orderBy: { createdAt: "desc" },
			include: {
				service: {
					select: {
						title: true,
					},
				},
				client: {
					select: {
						name: true,
						image: true,
					},
				},
			},
		});

		// Calculate growth rates
		const bookingGrowth =
			lastMonthBookings > 0
				? ((thisMonthBookings - lastMonthBookings) / lastMonthBookings) * 100
				: thisMonthBookings > 0
					? 100
					: 0;

		const earningsGrowth =
			(lastMonthEarnings._sum.netAmount || 0) > 0
				? (((thisMonthEarnings._sum.netAmount || 0) -
						(lastMonthEarnings._sum.netAmount || 0)) /
						(lastMonthEarnings._sum.netAmount || 0)) *
					100
				: (thisMonthEarnings._sum.netAmount || 0) > 0
					? 100
					: 0;

		return {
			bookings: {
				total: totalBookings,
				thisMonth: thisMonthBookings,
				pending: pendingBookings,
				completed: completedBookings,
				growth: bookingGrowth,
			},
			earnings: {
				total: totalEarnings._sum.netAmount || 0,
				thisMonth: thisMonthEarnings._sum.netAmount || 0,
				available: user.accountBalance,
				growth: earningsGrowth,
			},
			services: {
				active: activeServices,
				total: totalServices,
			},
			recentBookings,
		};
	}),

	// Get monthly earnings chart data
	getEarningsChart: protectedProcedure
		.input(
			z.object({
				months: z.number().min(1).max(12).default(6),
			}),
		)
		.query(async ({ ctx, input }) => {
			// Verify user is professional
			const user = await ctx.db.user.findUnique({
				where: { id: ctx.session.user.id },
			});

			if (!user?.isProfessional) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Only professionals can access earnings data",
				});
			}

			const now = new Date();
			const startDate = new Date(
				now.getFullYear(),
				now.getMonth() - input.months + 1,
				1,
			);

			// Get monthly earnings
			const earnings = await ctx.db.payment.findMany({
				where: {
					booking: {
						providerId: ctx.session.user.id,
						completedAt: { gte: startDate },
					},
					status: "paid",
				},
				select: {
					netAmount: true,
					booking: {
						select: {
							completedAt: true,
						},
					},
				},
			});

			// Group by month
			const monthlyData = earnings.reduce(
				(acc, payment) => {
					if (payment.booking.completedAt) {
						const monthKey = payment.booking.completedAt
							.toISOString()
							.slice(0, 7); // YYYY-MM
						if (!acc[monthKey]) {
							acc[monthKey] = 0;
						}
						acc[monthKey] += payment.netAmount;
					}
					return acc;
				},
				{} as Record<string, number>,
			);

			// Fill in missing months with 0
			const result = [];
			for (let i = 0; i < input.months; i++) {
				const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
				const monthKey = date.toISOString().slice(0, 7);
				result.unshift({
					month: monthKey,
					earnings: monthlyData[monthKey] || 0,
				});
			}

			return result;
		}),

	// Request withdrawal
	requestWithdrawal: protectedProcedure
		.input(
			z.object({
				amount: z.number().positive(),
				bankAccountId: z.string().cuid().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// Verify user is professional
			const user = await ctx.db.user.findUnique({
				where: { id: ctx.session.user.id },
				include: {
					bankAccounts: {
						where: {
							isDefault: true,
						},
					},
				},
			});

			if (!user?.isProfessional) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Only professionals can request withdrawals",
				});
			}

			// Check if user has sufficient balance
			if (user.accountBalance < input.amount) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Insufficient balance for withdrawal",
				});
			}

			// Minimum withdrawal amount
			if (input.amount < 10) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Minimum withdrawal amount is R$ 10.00",
				});
			}

			// Get bank account
			let bankAccount:
				| { id: string; [key: string]: unknown }
				| null
				| undefined;
			if (input.bankAccountId) {
				bankAccount = await ctx.db.bankAccount.findFirst({
					where: {
						id: input.bankAccountId,
						userId: ctx.session.user.id,
					},
				});
			} else {
				bankAccount = user.bankAccounts[0];
			}

			if (!bankAccount) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "No bank account found. Please add a bank account first.",
				});
			}

			// Check for pending withdrawals
			const pendingWithdrawal = await ctx.db.withdrawal.findFirst({
				where: {
					userId: ctx.session.user.id,
					status: { in: ["pending", "processing"] },
				},
			});

			if (pendingWithdrawal) {
				throw new TRPCError({
					code: "CONFLICT",
					message: "You already have a pending withdrawal request",
				});
			}

			// Create withdrawal request
			const withdrawal = await ctx.db.$transaction(async (tx) => {
				// Deduct amount from user balance
				await tx.user.update({
					where: { id: ctx.session.user.id },
					data: {
						accountBalance: {
							decrement: input.amount,
						},
					},
				});

				// Create withdrawal record
				const newWithdrawal = await tx.withdrawal.create({
					data: {
						userId: ctx.session.user.id,
						amount: input.amount,
						bankAccountId: bankAccount.id,
						status: "pending",
					},
				});

				return newWithdrawal;
			});

			// In a real implementation, you would integrate with Pagarme's transfer API here
			// For now, we'll simulate it by updating the status after a delay
			setTimeout(async () => {
				await ctx.db.withdrawal.update({
					where: { id: withdrawal.id },
					data: { status: "processing" },
				});

				// Create notification
				await ctx.db.notification.create({
					data: {
						userId: ctx.session.user.id,
						type: "withdrawal_processing",
						title: "Withdrawal Processing",
						message: `Your withdrawal of R$ ${input.amount.toFixed(2)} is being processed`,
					},
				});
			}, 1000);

			return withdrawal;
		}),

	// Get withdrawal history
	getWithdrawals: protectedProcedure
		.input(
			z.object({
				limit: z.number().min(1).max(50).default(20),
				cursor: z.string().optional(),
			}),
		)
		.query(async ({ ctx, input }) => {
			// Verify user is professional
			const user = await ctx.db.user.findUnique({
				where: { id: ctx.session.user.id },
			});

			if (!user?.isProfessional) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Only professionals can view withdrawal history",
				});
			}

			const withdrawals = await ctx.db.withdrawal.findMany({
				where: { userId: ctx.session.user.id },
				take: input.limit + 1,
				cursor: input.cursor ? { id: input.cursor } : undefined,
				orderBy: { createdAt: "desc" },
			});

			let nextCursor: typeof input.cursor | undefined = undefined;
			if (withdrawals.length > input.limit) {
				const nextItem = withdrawals.pop();
				nextCursor = nextItem?.id;
			}

			return {
				withdrawals,
				nextCursor,
			};
		}),

	// Get bank accounts
	getBankAccounts: protectedProcedure.query(async ({ ctx }) => {
		const bankAccounts = await ctx.db.bankAccount.findMany({
			where: { userId: ctx.session.user.id },
			orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
		});

		return bankAccounts;
	}),

	// Add bank account
	addBankAccount: protectedProcedure
		.input(
			z.object({
				bankName: z.string().min(1),
				accountType: z.enum(["checking", "savings"]),
				accountNumber: z.string().min(1),
				agencyNumber: z.string().min(1),
				holderName: z.string().min(1),
				holderCpf: z.string().length(11),
				isDefault: z.boolean().default(false),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// Check if account already exists
			const existingAccount = await ctx.db.bankAccount.findUnique({
				where: {
					userId_accountNumber_agencyNumber: {
						userId: ctx.session.user.id,
						accountNumber: input.accountNumber,
						agencyNumber: input.agencyNumber,
					},
				},
			});

			if (existingAccount) {
				throw new TRPCError({
					code: "CONFLICT",
					message: "Bank account already exists",
				});
			}

			// If this is set as default, unset other defaults
			if (input.isDefault) {
				await ctx.db.bankAccount.updateMany({
					where: { userId: ctx.session.user.id },
					data: { isDefault: false },
				});
			}

			const bankAccount = await ctx.db.bankAccount.create({
				data: {
					...input,
					userId: ctx.session.user.id,
				},
			});

			return bankAccount;
		}),

	// Delete bank account
	deleteBankAccount: protectedProcedure
		.input(
			z.object({
				bankAccountId: z.string().cuid(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// Verify bank account belongs to user
			const bankAccount = await ctx.db.bankAccount.findFirst({
				where: {
					id: input.bankAccountId,
					userId: ctx.session.user.id,
				},
			});

			if (!bankAccount) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Bank account not found",
				});
			}

			// Check if there are pending withdrawals using this account
			const pendingWithdrawals = await ctx.db.withdrawal.count({
				where: {
					bankAccountId: bankAccount.id,
					status: { in: ["pending", "processing"] },
				},
			});

			if (pendingWithdrawals > 0) {
				throw new TRPCError({
					code: "CONFLICT",
					message: "Cannot delete bank account with pending withdrawals",
				});
			}

			await ctx.db.bankAccount.delete({
				where: { id: input.bankAccountId },
			});

			// If this was the default account, set another as default if available
			if (bankAccount.isDefault) {
				const remainingAccounts = await ctx.db.bankAccount.findFirst({
					where: { userId: ctx.session.user.id },
				});

				if (remainingAccounts) {
					await ctx.db.bankAccount.update({
						where: { id: remainingAccounts.id },
						data: { isDefault: true },
					});
				}
			}

			return { success: true };
		}),
});
