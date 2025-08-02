import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";

interface EscrowConfig {
	holdingPeriodDays: number;
	platformFeePercentage: number;
	minimumWithdrawalAmount: number;
}

export class EscrowService {
	private config: EscrowConfig;

	constructor(config?: Partial<EscrowConfig>) {
		this.config = {
			holdingPeriodDays: 15,
			platformFeePercentage: 0.05, // 5%
			minimumWithdrawalAmount: 10.0, // R$ 10
			...config,
		};
	}

	/**
	 * Calculate platform fee and net amount for a payment
	 */
	calculateFees(amount: number): { serviceFee: number; netAmount: number } {
		const serviceFee = amount * this.config.platformFeePercentage;
		const netAmount = amount - serviceFee;

		return { serviceFee, netAmount };
	}

	/**
	 * Set escrow release date for a completed booking
	 */
	async setEscrowReleaseDate(
		paymentId: string,
		completedAt?: Date,
	): Promise<void> {
		const releaseDate = new Date(completedAt || new Date());
		releaseDate.setDate(releaseDate.getDate() + this.config.holdingPeriodDays);

		await db.payment.update({
			where: { id: paymentId },
			data: {
				escrowReleaseDate: releaseDate,
			},
		});
	}

	/**
	 * Get all payments ready for escrow release
	 */
	async getPaymentsReadyForRelease(): Promise<
		Array<{
			id: string;
			amount: number;
			netAmount: number;
			booking: {
				id: string;
				providerId: string;
				service: { title: string };
			};
		}>
	> {
		return await db.payment.findMany({
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
			include: {
				booking: {
					include: {
						service: {
							select: { title: true },
						},
					},
				},
			},
		});
	}

	/**
	 * Release escrow funds to professional's account balance
	 */
	async releaseFunds(paymentId: string): Promise<void> {
		const payment = await db.payment.findUnique({
			where: { id: paymentId },
			include: {
				booking: {
					include: {
						provider: true,
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

		// Validate payment is eligible for release
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

		if (!payment.escrowReleaseDate || payment.escrowReleaseDate > new Date()) {
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

		// Execute release in transaction
		await db.$transaction(async (tx) => {
			// Mark payment as released
			await tx.payment.update({
				where: { id: paymentId },
				data: {
					releasedAt: new Date(),
				},
			});

			// Add funds to provider's account balance
			await tx.user.update({
				where: { id: payment.booking.provider.id },
				data: {
					accountBalance: {
						increment: payment.netAmount,
					},
				},
			});

			// Create notification for provider
			await tx.notification.create({
				data: {
					userId: payment.booking.provider.id,
					type: "funds_available",
					title: "Fundos Disponíveis",
					message: `R$ ${payment.netAmount.toFixed(2)} estão disponíveis para saque referente ao serviço "${payment.booking.service.title}"`,
				},
			});
		});
	}

	/**
	 * Process bulk escrow releases (for cron job)
	 */
	async processBulkRelease(): Promise<{ released: number; errors: number }> {
		const paymentsToRelease = await this.getPaymentsReadyForRelease();
		let released = 0;
		let errors = 0;

		for (const payment of paymentsToRelease) {
			try {
				await this.releaseFunds(payment.id);
				released++;
			} catch (error) {
				console.error(
					`Failed to release funds for payment ${payment.id}:`,
					error,
				);
				errors++;
			}
		}

		return { released, errors };
	}

	/**
	 * Handle disputed payments (freeze escrow)
	 */
	async freezeEscrow(
		paymentId: string,
		reason: string,
		disputedBy: string,
	): Promise<void> {
		const payment = await db.payment.findUnique({
			where: { id: paymentId },
			include: {
				booking: {
					include: {
						client: true,
						provider: true,
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

		if (payment.releasedAt) {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: "Cannot dispute payment - funds already released",
			});
		}

		await db.$transaction(async (tx) => {
			// Extend escrow release date by 30 days for investigation
			const newReleaseDate = new Date();
			newReleaseDate.setDate(newReleaseDate.getDate() + 30);

			await tx.payment.update({
				where: { id: paymentId },
				data: {
					escrowReleaseDate: newReleaseDate,
				},
			});

			// Create notifications for both parties
			await tx.notification.createMany({
				data: [
					{
						userId: payment.booking.clientId,
						type: "payment_disputed",
						title: "Pagamento em Disputa",
						message: `O pagamento para "${payment.booking.service.title}" está em disputa. Nossa equipe entrará em contato.`,
					},
					{
						userId: payment.booking.providerId,
						type: "payment_disputed",
						title: "Pagamento em Disputa",
						message: `O pagamento para "${payment.booking.service.title}" está em disputa. Nossa equipe entrará em contato.`,
					},
				],
			});

			// Log the dispute for admin review
			console.log(`Payment ${paymentId} disputed by ${disputedBy}: ${reason}`);
		});
	}

	/**
	 * Get provider's earnings summary
	 */
	async getProviderEarnings(providerId: string): Promise<{
		totalEarnings: number;
		availableBalance: number;
		pendingEscrow: number;
		totalWithdrawn: number;
	}> {
		const [totalStats, availableBalance, pendingEscrow, totalWithdrawn] =
			await Promise.all([
				// Total earnings from completed payments
				db.payment.aggregate({
					where: {
						booking: {
							providerId,
							status: "completed",
						},
						status: "paid",
					},
					_sum: {
						netAmount: true,
					},
				}),

				// Available balance in user account
				db.user.findUnique({
					where: { id: providerId },
					select: { accountBalance: true },
				}),

				// Pending escrow amounts
				db.payment.aggregate({
					where: {
						booking: {
							providerId,
							status: "completed",
						},
						status: "paid",
						releasedAt: null,
					},
					_sum: {
						netAmount: true,
					},
				}),

				// Total withdrawn
				db.withdrawal.aggregate({
					where: {
						userId: providerId,
						status: "completed",
					},
					_sum: {
						amount: true,
					},
				}),
			]);

		return {
			totalEarnings: totalStats._sum.netAmount || 0,
			availableBalance: availableBalance?.accountBalance || 0,
			pendingEscrow: pendingEscrow._sum.netAmount || 0,
			totalWithdrawn: totalWithdrawn._sum.amount || 0,
		};
	}

	/**
	 * Process withdrawal request
	 */
	async processWithdrawal(
		userId: string,
		amount: number,
		bankAccountId: string,
	): Promise<string> {
		if (amount < this.config.minimumWithdrawalAmount) {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: `Valor mínimo para saque é R$ ${this.config.minimumWithdrawalAmount.toFixed(2)}`,
			});
		}

		const user = await db.user.findUnique({
			where: { id: userId },
			include: {
				bankAccounts: {
					where: { id: bankAccountId },
				},
			},
		});

		if (!user) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "User not found",
			});
		}

		if (user.accountBalance < amount) {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: "Saldo insuficiente",
			});
		}

		if (!user.bankAccounts.length) {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: "Conta bancária não encontrada",
			});
		}

		// Create withdrawal record and update balance in transaction
		const withdrawal = await db.$transaction(async (tx) => {
			const newWithdrawal = await tx.withdrawal.create({
				data: {
					userId,
					amount,
					bankAccountId,
					status: "pending",
				},
			});

			await tx.user.update({
				where: { id: userId },
				data: {
					accountBalance: {
						decrement: amount,
					},
				},
			});

			await tx.notification.create({
				data: {
					userId,
					type: "withdrawal_requested",
					title: "Saque Solicitado",
					message: `Saque de R$ ${amount.toFixed(2)} foi solicitado e está sendo processado.`,
				},
			});

			return newWithdrawal;
		});

		return withdrawal.id;
	}
}

// Export singleton instance
export const escrowService = new EscrowService();
