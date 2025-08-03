import type { PrismaClient, User } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

// Input schemas
export const updateProfileSchema = z.object({
	name: z.string().min(1).max(100).optional(),
	phone: z
		.string()
		.regex(/^\d{10,11}$/)
		.optional(),
	bio: z.string().max(500).optional(),
	image: z.string().url().optional(),
	address: z.string().max(200).optional(),
	city: z.string().max(100).optional(),
	state: z.string().length(2).optional(),
	zipCode: z
		.string()
		.regex(/^\d{8}$/)
		.optional(),
	notificationEmail: z.boolean().optional(),
	notificationSms: z.boolean().optional(),
	notificationWhatsapp: z.boolean().optional(),
});

export const addBankAccountSchema = z.object({
	bankName: z.string().min(1).max(100),
	accountType: z.enum(["checking", "savings"]),
	accountNumber: z.string().min(1).max(20),
	agencyNumber: z.string().min(1).max(10),
	holderName: z.string().min(1).max(100),
	holderCpf: z.string().length(11),
	isDefault: z.boolean().default(false),
});

export const requestWithdrawalSchema = z.object({
	amount: z.number().positive().max(10000),
	bankAccountId: z.string().cuid(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type AddBankAccountInput = z.infer<typeof addBankAccountSchema>;
export type RequestWithdrawalInput = z.infer<typeof requestWithdrawalSchema>;

// Dependencies interface
interface UserServiceDependencies {
	db: PrismaClient;
	currentUser?: User;
}

export class UserService {
	constructor(private deps: UserServiceDependencies) {}

	async updateProfile(input: UpdateProfileInput) {
		if (!this.deps.currentUser) {
			throw new TRPCError({
				code: "UNAUTHORIZED",
				message: "User not authenticated",
			});
		}

		// Update user profile
		const updatedUser = await this.deps.db.user.update({
			where: { id: this.deps.currentUser.id },
			data: input,
			select: {
				id: true,
				name: true,
				email: true,
				phone: true,
				bio: true,
				image: true,
				address: true,
				city: true,
				state: true,
				zipCode: true,
				notificationEmail: true,
				notificationSms: true,
				notificationWhatsapp: true,
				isProfessional: true,
				updatedAt: true,
			},
		});

		return updatedUser;
	}

	async getCurrentUser() {
		if (!this.deps.currentUser) {
			throw new TRPCError({
				code: "UNAUTHORIZED",
				message: "User not authenticated",
			});
		}

		const user = await this.deps.db.user.findUnique({
			where: { id: this.deps.currentUser.id },
			select: {
				id: true,
				name: true,
				email: true,
				image: true,
				phone: true,
				cpf: true,
				bio: true,
				address: true,
				city: true,
				state: true,
				zipCode: true,
				isProfessional: true,
				professionalSince: true,
				accountBalance: true,
				notificationEmail: true,
				notificationSms: true,
				notificationWhatsapp: true,
				createdAt: true,
				updatedAt: true,
			},
		});

		if (!user) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "User not found",
			});
		}

		return user;
	}

	async getUserById(userId: string) {
		const user = await this.deps.db.user.findUnique({
			where: { id: userId },
			select: {
				id: true,
				name: true,
				image: true,
				bio: true,
				city: true,
				state: true,
				isProfessional: true,
				professionalSince: true,
				createdAt: true,
			},
		});

		if (!user) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "User not found",
			});
		}

		return user;
	}

	async addBankAccount(input: AddBankAccountInput) {
		if (!this.deps.currentUser) {
			throw new TRPCError({
				code: "UNAUTHORIZED",
				message: "User not authenticated",
			});
		}

		// Verify user is professional
		if (!this.deps.currentUser.isProfessional) {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: "Only professionals can add bank accounts",
			});
		}

		// Check for duplicate bank account
		const existingAccount = await this.deps.db.bankAccount.findFirst({
			where: {
				userId: this.deps.currentUser.id,
				accountNumber: input.accountNumber,
				agencyNumber: input.agencyNumber,
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
			await this.deps.db.bankAccount.updateMany({
				where: { userId: this.deps.currentUser.id, isDefault: true },
				data: { isDefault: false },
			});
		}

		// Create bank account
		const bankAccount = await this.deps.db.bankAccount.create({
			data: {
				...input,
				userId: this.deps.currentUser.id,
			},
		});

		return bankAccount;
	}

	async getBankAccounts() {
		if (!this.deps.currentUser) {
			throw new TRPCError({
				code: "UNAUTHORIZED",
				message: "User not authenticated",
			});
		}

		// Verify user is professional
		if (!this.deps.currentUser.isProfessional) {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: "Only professionals can view bank accounts",
			});
		}

		return await this.deps.db.bankAccount.findMany({
			where: { userId: this.deps.currentUser.id },
			orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
		});
	}

	async requestWithdrawal(input: RequestWithdrawalInput) {
		if (!this.deps.currentUser) {
			throw new TRPCError({
				code: "UNAUTHORIZED",
				message: "User not authenticated",
			});
		}

		// Verify user is professional
		if (!this.deps.currentUser.isProfessional) {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: "Only professionals can request withdrawals",
			});
		}

		if (this.deps.currentUser.accountBalance < input.amount) {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: "Insufficient balance",
			});
		}

		// Verify bank account exists
		const bankAccount = await this.deps.db.bankAccount.findFirst({
			where: {
				id: input.bankAccountId,
				userId: this.deps.currentUser.id,
			},
		});

		if (!bankAccount) {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: "Bank account not found",
			});
		}

		// Minimum withdrawal amount
		if (input.amount < 10) {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: "Minimum withdrawal amount is R$ 10.00",
			});
		}

		// Create withdrawal request and update balance in transaction
		const currentUserId = this.deps.currentUser.id;
		const result = await this.deps.db.$transaction(async (tx) => {
			const withdrawal = await tx.withdrawal.create({
				data: {
					userId: currentUserId,
					amount: input.amount,
					bankAccountId: input.bankAccountId,
					status: "pending",
				},
			});

			await tx.user.update({
				where: { id: currentUserId },
				data: {
					accountBalance: {
						decrement: input.amount,
					},
				},
			});

			// Create notification
			await tx.notification.create({
				data: {
					userId: currentUserId,
					type: "withdrawal_requested",
					title: "Withdrawal Requested",
					message: `Withdrawal of R$ ${input.amount.toFixed(2)} has been requested and is being processed.`,
				},
			});

			return withdrawal;
		});

		return result;
	}

	async getEarningsSummary() {
		if (!this.deps.currentUser) {
			throw new TRPCError({
				code: "UNAUTHORIZED",
				message: "User not authenticated",
			});
		}

		// Verify user is professional
		if (!this.deps.currentUser.isProfessional) {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: "Only professionals can view earnings",
			});
		}

		// Get earnings statistics
		const [totalEarnings, pendingEscrow, totalWithdrawn] = await Promise.all([
			// Total lifetime earnings (from completed payments)
			this.deps.db.payment.aggregate({
				where: {
					booking: {
						providerId: this.deps.currentUser.id,
					},
					status: "paid",
					releasedAt: { not: null },
				},
				_sum: { netAmount: true },
			}),

			// Amount still in escrow
			this.deps.db.payment.aggregate({
				where: {
					booking: {
						providerId: this.deps.currentUser.id,
					},
					status: "paid",
					releasedAt: null,
				},
				_sum: { netAmount: true },
			}),

			// Total amount withdrawn
			this.deps.db.withdrawal.aggregate({
				where: {
					userId: this.deps.currentUser.id,
					status: "completed",
				},
				_sum: { amount: true },
			}),
		]);

		return {
			totalEarnings: totalEarnings._sum.netAmount || 0,
			availableBalance: this.deps.currentUser.accountBalance,
			pendingEscrow: pendingEscrow._sum.netAmount || 0,
			totalWithdrawn: totalWithdrawn._sum.amount || 0,
		};
	}

	async becomeProfessional() {
		if (!this.deps.currentUser) {
			throw new TRPCError({
				code: "UNAUTHORIZED",
				message: "User not authenticated",
			});
		}

		// Check if user already is professional
		if (this.deps.currentUser.isProfessional) {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: "User is already a professional",
			});
		}

		// Update user to professional status
		const updatedUser = await this.deps.db.user.update({
			where: { id: this.deps.currentUser.id },
			data: {
				isProfessional: true,
				professionalSince: new Date(),
			},
			select: {
				id: true,
				isProfessional: true,
				professionalSince: true,
			},
		});

		// Create welcome notification
		await this.deps.db.notification.create({
			data: {
				userId: this.deps.currentUser.id,
				type: "professional_welcome",
				title: "Welcome, Professional!",
				message:
					"Congratulations! You are now registered as a professional. You can start offering your services.",
			},
		});

		return updatedUser;
	}
}

// Export factory function for easy instantiation
export const createUserService = (deps: UserServiceDependencies) =>
	new UserService(deps);
