import type { PrismaClient } from "@prisma/client";
import { TRPCError } from "@trpc/server";

export interface UserProfileUpdate {
	name?: string;
	image?: string;
	phone?: string;
	cpf?: string;
	bio?: string;
	address?: string;
	city?: string;
	state?: string;
	zipCode?: string;
}

export interface BecomeProfessionalData {
	cpf: string;
	phone: string;
	bio: string;
	address: string;
	city: string;
	state: string;
	zipCode: string;
	acceptTerms: boolean;
}

export interface NotificationPreferences {
	notificationEmail?: boolean;
	notificationSms?: boolean;
	notificationWhatsapp?: boolean;
}

export interface BankAccountData {
	bankName: string;
	accountType: "checking" | "savings";
	accountNumber: string;
	agencyNumber: string;
	holderName: string;
	holderCpf: string;
	isDefault?: boolean;
}

export interface WithdrawalRequest {
	amount: number;
	bankAccountId?: string;
}

export class UserService {
	constructor(private db: PrismaClient) {}

	async getCurrentUser(userId: string) {
		const user = await this.db.user.findUnique({
			where: { id: userId },
			select: {
				id: true,
				email: true,
				name: true,
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
				emailVerified: true,
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

	async updateProfile(userId: string, data: UserProfileUpdate) {
		const user = await this.db.user.update({
			where: { id: userId },
			data,
		});

		return user;
	}

	async getUserById(userId: string) {
		const user = await this.db.user.findUnique({
			where: { id: userId },
			select: {
				id: true,
				name: true,
				image: true,
				bio: true,
				isProfessional: true,
				professionalSince: true,
				createdAt: true,
				_count: {
					select: {
						services: true,
						professionalBookings: true,
						professionalReviews: true,
					},
				},
			},
		});

		if (!user) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "User not found",
			});
		}

		// Calculate average rating if user is professional
		let avgRating = null;
		if (user.isProfessional) {
			const reviews = await this.db.review.aggregate({
				where: { providerId: user.id },
				_avg: { rating: true },
			});
			avgRating = reviews._avg.rating;
		}

		return {
			...user,
			avgRating,
		};
	}

	async becomeProfessional(userId: string, data: BecomeProfessionalData) {
		if (!data.acceptTerms) {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: "You must accept the terms to become a professional",
			});
		}

		const user = await this.db.user.findUnique({
			where: { id: userId },
		});

		if (!user) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "User not found",
			});
		}

		if (user.isProfessional) {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: "User is already a professional",
			});
		}

		// Check if CPF is already taken
		const existingUserWithCpf = await this.db.user.findUnique({
			where: { cpf: data.cpf },
		});

		if (existingUserWithCpf && existingUserWithCpf.id !== user.id) {
			throw new TRPCError({
				code: "CONFLICT",
				message: "CPF already registered",
			});
		}

		// Update user to professional
		const updatedUser = await this.db.user.update({
			where: { id: user.id },
			data: {
				cpf: data.cpf,
				phone: data.phone,
				bio: data.bio,
				address: data.address,
				city: data.city,
				state: data.state,
				zipCode: data.zipCode,
				isProfessional: true,
				professionalSince: new Date(),
			},
		});

		return updatedUser;
	}

	async updateNotificationPreferences(
		userId: string,
		preferences: NotificationPreferences,
	) {
		const user = await this.db.user.update({
			where: { id: userId },
			data: preferences,
		});

		return user;
	}

	async addBankAccount(userId: string, data: BankAccountData) {
		// Verify user is professional
		const user = await this.db.user.findUnique({
			where: { id: userId },
		});

		if (!user?.isProfessional) {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: "Only professionals can add bank accounts",
			});
		}

		// Check for duplicate account
		const existingAccount = await this.db.bankAccount.findFirst({
			where: {
				userId,
				accountNumber: data.accountNumber,
				agencyNumber: data.agencyNumber,
			},
		});

		if (existingAccount) {
			throw new TRPCError({
				code: "CONFLICT",
				message: "Bank account already exists",
			});
		}

		// If setting as default, unset other defaults
		if (data.isDefault) {
			await this.db.bankAccount.updateMany({
				where: {
					userId,
					isDefault: true,
				},
				data: { isDefault: false },
			});
		}

		const bankAccount = await this.db.bankAccount.create({
			data: {
				...data,
				userId,
			},
		});

		return bankAccount;
	}

	async getBankAccounts(userId: string) {
		const accounts = await this.db.bankAccount.findMany({
			where: { userId },
			orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
		});

		return accounts;
	}

	async requestWithdrawal(userId: string, request: WithdrawalRequest) {
		// Get user with current balance
		const user = await this.db.user.findUnique({
			where: { id: userId },
		});

		if (!user?.isProfessional) {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: "Only professionals can request withdrawals",
			});
		}

		if (user.accountBalance < request.amount) {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: "Insufficient balance",
			});
		}

		// Get bank account (default if not specified)
		let bankAccount: { id: string; [key: string]: unknown } | null;
		if (request.bankAccountId) {
			bankAccount = await this.db.bankAccount.findFirst({
				where: {
					id: request.bankAccountId,
					userId,
				},
			});
		} else {
			bankAccount = await this.db.bankAccount.findFirst({
				where: {
					userId,
					isDefault: true,
				},
			});
		}

		if (!bankAccount) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Bank account not found. Please add a bank account first.",
			});
		}

		// Create withdrawal request
		const withdrawal = await this.db.withdrawal.create({
			data: {
				userId,
				amount: request.amount,
				bankAccountId: bankAccount.id,
				status: "pending",
			},
		});

		// Deduct from account balance (reserve funds)
		await this.db.user.update({
			where: { id: userId },
			data: {
				accountBalance: {
					decrement: request.amount,
				},
			},
		});

		return withdrawal;
	}

	async getEarningsSummary(userId: string) {
		const user = await this.db.user.findUnique({
			where: { id: userId },
		});

		if (!user?.isProfessional) {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: "Only professionals can view earnings",
			});
		}

		// Get completed payments (released from escrow)
		const [totalEarnings, pendingEscrow, totalWithdrawals, thisMonthEarnings] =
			await Promise.all([
				this.db.payment.aggregate({
					where: {
						booking: { providerId: userId },
						status: "paid",
						releasedAt: { not: null },
					},
					_sum: { netAmount: true },
				}),
				this.db.payment.aggregate({
					where: {
						booking: { providerId: userId },
						status: "paid",
						releasedAt: null,
						escrowReleaseDate: { lte: new Date() },
					},
					_sum: { netAmount: true },
				}),
				this.db.withdrawal.aggregate({
					where: {
						userId,
						status: "completed",
					},
					_sum: { amount: true },
				}),
				this.db.payment.aggregate({
					where: {
						booking: { providerId: userId },
						status: "paid",
						releasedAt: {
							gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
						},
					},
					_sum: { netAmount: true },
				}),
			]);

		return {
			currentBalance: user.accountBalance,
			totalEarnings: totalEarnings._sum.netAmount || 0,
			pendingEscrow: pendingEscrow._sum.netAmount || 0,
			totalWithdrawals: totalWithdrawals._sum.amount || 0,
			thisMonthEarnings: thisMonthEarnings._sum.netAmount || 0,
		};
	}
}
