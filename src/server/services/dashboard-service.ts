import type { PrismaClient } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import type { Session } from "next-auth";
import { z } from "zod";

// Input schemas
export const getEarningsChartSchema = z.object({
	months: z.number().min(1).max(12).default(6),
});

export const requestWithdrawalSchema = z.object({
	amount: z.number().positive(),
	bankAccountId: z.string().cuid().optional(),
});

export const getWithdrawalsSchema = z.object({
	limit: z.number().min(1).max(50).default(20),
	cursor: z.string().optional(),
});

export const getEarningsSchema = z.object({
	period: z.enum(["week", "month", "year"]).default("month"),
});

export const addBankAccountSchema = z.object({
	bankName: z.string().min(1),
	accountType: z.enum(["checking", "savings"]),
	accountNumber: z.string().min(1),
	agencyNumber: z.string().min(1),
	holderName: z.string().min(1),
	holderCpf: z.string().length(11),
	isDefault: z.boolean().default(false),
});

export const deleteBankAccountSchema = z.object({
	bankAccountId: z.string().cuid(),
});

// Service types
type GetEarningsChartInput = z.infer<typeof getEarningsChartSchema>;
type RequestWithdrawalInput = z.infer<typeof requestWithdrawalSchema>;
type GetWithdrawalsInput = z.infer<typeof getWithdrawalsSchema>;
type GetEarningsInput = z.infer<typeof getEarningsSchema>;
type AddBankAccountInput = z.infer<typeof addBankAccountSchema>;
type DeleteBankAccountInput = z.infer<typeof deleteBankAccountSchema>;

export function createDashboardService({
	db,
	currentUser,
}: {
	db: PrismaClient;
	currentUser?: Session["user"];
}) {
	async function verifyProfessionalStatus(userId: string) {
		const user = await db.user.findUnique({
			where: { id: userId },
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
		async getOverview() {
			if (!currentUser) {
				throw new TRPCError({
					code: "UNAUTHORIZED",
					message: "User not authenticated",
				});
			}

			const user = await verifyProfessionalStatus(currentUser.id);

			// Get current date ranges
			const now = new Date();
			const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
			const startOfLastMonth = new Date(
				now.getFullYear(),
				now.getMonth() - 1,
				1,
			);
			const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

			// Get booking statistics
			const [
				totalBookings,
				thisMonthBookings,
				lastMonthBookings,
				pendingBookings,
				completedBookings,
			] = await Promise.all([
				db.booking.count({
					where: { providerId: currentUser.id },
				}),
				db.booking.count({
					where: {
						providerId: currentUser.id,
						createdAt: { gte: startOfMonth },
					},
				}),
				db.booking.count({
					where: {
						providerId: currentUser.id,
						createdAt: {
							gte: startOfLastMonth,
							lte: endOfLastMonth,
						},
					},
				}),
				db.booking.count({
					where: {
						providerId: currentUser.id,
						status: "pending",
					},
				}),
				db.booking.count({
					where: {
						providerId: currentUser.id,
						status: "completed",
					},
				}),
			]);

			// Get earnings statistics
			const [thisMonthEarnings, lastMonthEarnings, totalEarnings] =
				await Promise.all([
					db.payment.aggregate({
						where: {
							booking: {
								providerId: currentUser.id,
								completedAt: { gte: startOfMonth },
							},
							status: "paid",
						},
						_sum: { netAmount: true },
					}),
					db.payment.aggregate({
						where: {
							booking: {
								providerId: currentUser.id,
								completedAt: {
									gte: startOfLastMonth,
									lte: endOfLastMonth,
								},
							},
							status: "paid",
						},
						_sum: { netAmount: true },
					}),
					db.payment.aggregate({
						where: {
							booking: { providerId: currentUser.id },
							status: "paid",
							releasedAt: { not: null },
						},
						_sum: { netAmount: true },
					}),
				]);

			// Get service statistics
			const [activeServices, totalServices] = await Promise.all([
				db.service.count({
					where: {
						providerId: currentUser.id,
						status: "active",
					},
				}),
				db.service.count({
					where: { providerId: currentUser.id },
				}),
			]);

			// Get recent bookings
			const recentBookings = await db.booking.findMany({
				where: { providerId: currentUser.id },
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
		},

		async getEarningsChart(input: GetEarningsChartInput) {
			if (!currentUser) {
				throw new TRPCError({
					code: "UNAUTHORIZED",
					message: "User not authenticated",
				});
			}

			await verifyProfessionalStatus(currentUser.id);

			const now = new Date();
			const startDate = new Date(
				now.getFullYear(),
				now.getMonth() - input.months + 1,
				1,
			);

			// Get monthly earnings
			const earnings = await db.payment.findMany({
				where: {
					booking: {
						providerId: currentUser.id,
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
					if (payment.booking?.completedAt) {
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
		},

		async getEarnings(input: GetEarningsInput) {
			if (!currentUser) {
				throw new TRPCError({
					code: "UNAUTHORIZED",
					message: "User not authenticated",
				});
			}

			const user = await verifyProfessionalStatus(currentUser.id);

			// Calculate date range based on period
			const now = new Date();
			let startDate: Date;

			switch (input.period) {
				case "week":
					startDate = new Date(now);
					startDate.setDate(now.getDate() - 7);
					break;
				case "month":
					startDate = new Date(now.getFullYear(), now.getMonth(), 1);
					break;
				case "year":
					startDate = new Date(now.getFullYear(), 0, 1);
					break;
			}

			// Get total earnings in period
			const periodEarnings = await db.payment.aggregate({
				where: {
					booking: {
						providerId: currentUser.id,
						completedAt: { gte: startDate },
					},
					status: "paid",
				},
				_sum: {
					amount: true,
					netAmount: true,
					serviceFee: true,
				},
			});

			// Get pending earnings (in escrow)
			const pendingEarnings = await db.payment.aggregate({
				where: {
					booking: {
						providerId: currentUser.id,
					},
					status: "paid",
					releasedAt: null,
				},
				_sum: {
					netAmount: true,
				},
			});

			// Get recent transactions
			const transactions = await db.payment.findMany({
				where: {
					booking: {
						providerId: currentUser.id,
						completedAt: { gte: startDate },
					},
					status: "paid",
				},
				include: {
					booking: {
						include: {
							service: {
								select: {
									title: true,
								},
							},
							client: {
								select: {
									name: true,
								},
							},
						},
					},
				},
				orderBy: {
					createdAt: "desc",
				},
				take: 50,
			});

			// Format transactions for display
			const formattedTransactions = transactions.map((payment) => ({
				id: payment.id,
				date:
					payment.booking?.completedAt ||
					payment.booking?.bookingDate ||
					new Date(),
				description: payment.booking?.service?.title || "Service",
				clientName: payment.booking?.client?.name || "Cliente",
				amount: payment.netAmount,
				status: payment.releasedAt ? "released" : "pending",
			}));

			return {
				total: periodEarnings._sum?.netAmount || 0,
				available: user.accountBalance,
				pending: pendingEarnings._sum?.netAmount || 0,
				fees: periodEarnings._sum?.serviceFee || 0,
				transactions: formattedTransactions,
			};
		},

		async requestWithdrawal(input: RequestWithdrawalInput) {
			if (!currentUser) {
				throw new TRPCError({
					code: "UNAUTHORIZED",
					message: "User not authenticated",
				});
			}

			const user = await db.user.findUnique({
				where: { id: currentUser.id },
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
				bankAccount = await db.bankAccount.findFirst({
					where: {
						id: input.bankAccountId,
						userId: currentUser.id,
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
			const pendingWithdrawal = await db.withdrawal.findFirst({
				where: {
					userId: currentUser.id,
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
			const withdrawal = await db.$transaction(async (tx) => {
				// Deduct amount from user balance
				await tx.user.update({
					where: { id: currentUser.id },
					data: {
						accountBalance: {
							decrement: input.amount,
						},
					},
				});

				// Create withdrawal record
				const newWithdrawal = await tx.withdrawal.create({
					data: {
						userId: currentUser.id,
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
				await db.withdrawal.update({
					where: { id: withdrawal.id },
					data: { status: "processing" },
				});

				// Create notification
				await db.notification.create({
					data: {
						userId: currentUser.id,
						type: "withdrawal_processing",
						title: "Withdrawal Processing",
						message: `Your withdrawal of R$ ${input.amount.toFixed(2)} is being processed`,
					},
				});
			}, 1000);

			return withdrawal;
		},

		async getWithdrawals(input: GetWithdrawalsInput) {
			if (!currentUser) {
				throw new TRPCError({
					code: "UNAUTHORIZED",
					message: "User not authenticated",
				});
			}

			await verifyProfessionalStatus(currentUser.id);

			const withdrawals = await db.withdrawal.findMany({
				where: { userId: currentUser.id },
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
		},

		async getBankAccounts() {
			if (!currentUser) {
				throw new TRPCError({
					code: "UNAUTHORIZED",
					message: "User not authenticated",
				});
			}

			const bankAccounts = await db.bankAccount.findMany({
				where: { userId: currentUser.id },
				orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
			});

			return bankAccounts;
		},

		async addBankAccount(input: AddBankAccountInput) {
			if (!currentUser) {
				throw new TRPCError({
					code: "UNAUTHORIZED",
					message: "User not authenticated",
				});
			}

			// Check if account already exists
			const existingAccount = await db.bankAccount.findUnique({
				where: {
					userId_accountNumber_agencyNumber: {
						userId: currentUser.id,
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
				await db.bankAccount.updateMany({
					where: { userId: currentUser.id },
					data: { isDefault: false },
				});
			}

			const bankAccount = await db.bankAccount.create({
				data: {
					...input,
					userId: currentUser.id,
				},
			});

			return bankAccount;
		},

		async deleteBankAccount(input: DeleteBankAccountInput) {
			if (!currentUser) {
				throw new TRPCError({
					code: "UNAUTHORIZED",
					message: "User not authenticated",
				});
			}

			// Verify bank account belongs to user
			const bankAccount = await db.bankAccount.findFirst({
				where: {
					id: input.bankAccountId,
					userId: currentUser.id,
				},
			});

			if (!bankAccount) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Bank account not found",
				});
			}

			// Check if there are pending withdrawals using this account
			const pendingWithdrawals = await db.withdrawal.count({
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

			await db.bankAccount.delete({
				where: { id: input.bankAccountId },
			});

			// If this was the default account, set another as default if available
			if (bankAccount.isDefault) {
				const remainingAccounts = await db.bankAccount.findFirst({
					where: { userId: currentUser.id },
				});

				if (remainingAccounts) {
					await db.bankAccount.update({
						where: { id: remainingAccounts.id },
						data: { isDefault: true },
					});
				}
			}

			return { success: true };
		},
	};
}
