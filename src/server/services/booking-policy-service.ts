import type { PrismaClient } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { differenceInHours } from "date-fns";

interface BookingPolicyDeps {
	db: PrismaClient;
	currentUserId: string;
}

interface CreatePolicyInput {
	serviceId: string;
	name: string;
	type: "cancellation" | "rescheduling" | "no-show";
	description: string;
	hoursBeforeBooking: number;
	penaltyType?: "none" | "percentage" | "fixed";
	penaltyValue?: number;
	allowExceptions?: boolean;
	exceptionConditions?: Record<string, unknown>; // JSON conditions
}

interface PolicyEvaluationResult {
	allowed: boolean;
	penalty?: number;
	reason?: string;
}

export class BookingPolicyService {
	constructor(private deps: BookingPolicyDeps) {}

	/**
	 * Create a booking policy for a service
	 */
	async createPolicy(input: CreatePolicyInput) {
		// Verify service ownership
		const service = await this.deps.db.service.findUnique({
			where: { id: input.serviceId },
		});

		if (!service) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Service not found",
			});
		}

		if (service.providerId !== this.deps.currentUserId) {
			throw new TRPCError({
				code: "UNAUTHORIZED",
				message: "You can only create policies for your own services",
			});
		}

		// Validate penalty
		if (input.penaltyType && input.penaltyType !== "none") {
			if (!input.penaltyValue || input.penaltyValue < 0) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Penalty value must be positive",
				});
			}

			if (input.penaltyType === "percentage" && input.penaltyValue > 100) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Percentage penalty cannot exceed 100%",
				});
			}
		}

		// Create the policy
		const policy = await this.deps.db.bookingPolicy.create({
			data: {
				serviceId: input.serviceId,
				name: input.name,
				type: input.type,
				description: input.description,
				hoursBeforeBooking: input.hoursBeforeBooking,
				penaltyType: input.penaltyType || "none",
				penaltyValue: input.penaltyValue || 0,
				allowExceptions: input.allowExceptions || false,
				exceptionConditions: input.exceptionConditions
					? JSON.stringify(input.exceptionConditions)
					: null,
				isActive: true,
			},
		});

		return policy;
	}

	/**
	 * Get policies for a service
	 */
	async getServicePolicies(serviceId: string) {
		return await this.deps.db.bookingPolicy.findMany({
			where: {
				serviceId,
				isActive: true,
			},
			orderBy: { type: "asc" },
		});
	}

	/**
	 * Evaluate cancellation policy
	 */
	async evaluateCancellationPolicy(
		bookingId: string,
	): Promise<PolicyEvaluationResult> {
		const booking = await this.deps.db.booking.findUnique({
			where: { id: bookingId },
			include: {
				service: {
					include: {
						policies: {
							where: {
								type: "cancellation",
								isActive: true,
							},
						},
					},
				},
				payment: true,
			},
		});

		if (!booking) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Booking not found",
			});
		}

		// Check if already cancelled
		if (booking.status === "cancelled") {
			return {
				allowed: false,
				reason: "Booking is already cancelled",
			};
		}

		// Calculate hours until booking
		const hoursUntilBooking = differenceInHours(
			booking.bookingDate,
			new Date(),
		);

		// If no policy, use service defaults
		const policy = booking.service.policies[0];
		if (!policy) {
			const defaultHours = booking.service.cancellationHours || 24;
			if (hoursUntilBooking < defaultHours) {
				return {
					allowed: false,
					reason: `Cancellations must be made at least ${defaultHours} hours in advance`,
				};
			}
			return { allowed: true };
		}

		// Evaluate policy
		if (hoursUntilBooking < policy.hoursBeforeBooking) {
			// Check for exceptions
			if (policy.allowExceptions && policy.exceptionConditions) {
				const exceptions = JSON.parse(policy.exceptionConditions);
				// TODO: Implement exception evaluation logic
			}

			// Calculate penalty
			let penalty = 0;
			if (policy.penaltyType === "percentage" && policy.penaltyValue) {
				penalty = (booking.totalPrice * policy.penaltyValue) / 100;
			} else if (policy.penaltyType === "fixed" && policy.penaltyValue) {
				penalty = Math.min(policy.penaltyValue, booking.totalPrice);
			}

			return {
				allowed: true,
				penalty,
				reason: policy.description,
			};
		}

		return { allowed: true };
	}

	/**
	 * Evaluate rescheduling policy
	 */
	async evaluateReschedulingPolicy(
		bookingId: string,
		newDate: Date,
	): Promise<PolicyEvaluationResult> {
		const booking = await this.deps.db.booking.findUnique({
			where: { id: bookingId },
			include: {
				service: {
					include: {
						policies: {
							where: {
								type: "rescheduling",
								isActive: true,
							},
						},
					},
				},
			},
		});

		if (!booking) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Booking not found",
			});
		}

		// Check if already completed or cancelled
		if (["completed", "cancelled"].includes(booking.status)) {
			return {
				allowed: false,
				reason: `Cannot reschedule ${booking.status} bookings`,
			};
		}

		// Calculate hours until booking
		const hoursUntilBooking = differenceInHours(
			booking.bookingDate,
			new Date(),
		);

		// If no policy, use service defaults
		const policy = booking.service.policies[0];
		if (!policy) {
			const defaultHours = booking.service.reschedulingHours || 24;
			if (hoursUntilBooking < defaultHours) {
				return {
					allowed: false,
					reason: `Rescheduling must be done at least ${defaultHours} hours in advance`,
				};
			}
			return { allowed: true };
		}

		// Evaluate policy
		if (hoursUntilBooking < policy.hoursBeforeBooking) {
			// Calculate penalty
			let penalty = 0;
			if (policy.penaltyType === "percentage" && policy.penaltyValue) {
				penalty = (booking.totalPrice * policy.penaltyValue) / 100;
			} else if (policy.penaltyType === "fixed" && policy.penaltyValue) {
				penalty = Math.min(policy.penaltyValue, booking.totalPrice);
			}

			return {
				allowed: true,
				penalty,
				reason: policy.description,
			};
		}

		return { allowed: true };
	}

	/**
	 * Apply no-show policy
	 */
	async applyNoShowPolicy(bookingId: string): Promise<PolicyEvaluationResult> {
		const booking = await this.deps.db.booking.findUnique({
			where: { id: bookingId },
			include: {
				service: {
					include: {
						policies: {
							where: {
								type: "no-show",
								isActive: true,
							},
						},
					},
				},
			},
		});

		if (!booking) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Booking not found",
			});
		}

		const policy = booking.service.policies[0];
		if (!policy) {
			// Default no-show penalty is full price
			return {
				allowed: true,
				penalty: booking.totalPrice,
				reason: "No-show penalty: full booking price",
			};
		}

		// Calculate penalty
		let penalty = 0;
		if (policy.penaltyType === "percentage" && policy.penaltyValue) {
			penalty = (booking.totalPrice * policy.penaltyValue) / 100;
		} else if (policy.penaltyType === "fixed" && policy.penaltyValue) {
			penalty = Math.min(policy.penaltyValue, booking.totalPrice);
		} else {
			penalty = booking.totalPrice; // Default to full price for no-show
		}

		return {
			allowed: true,
			penalty,
			reason: policy.description,
		};
	}

	/**
	 * Update a policy
	 */
	async updatePolicy(policyId: string, updates: Partial<CreatePolicyInput>) {
		const policy = await this.deps.db.bookingPolicy.findUnique({
			where: { id: policyId },
			include: { service: true },
		});

		if (!policy) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Policy not found",
			});
		}

		if (policy.service.providerId !== this.deps.currentUserId) {
			throw new TRPCError({
				code: "UNAUTHORIZED",
				message: "You can only update your own policies",
			});
		}

		return await this.deps.db.bookingPolicy.update({
			where: { id: policyId },
			data: {
				name: updates.name,
				description: updates.description,
				hoursBeforeBooking: updates.hoursBeforeBooking,
				penaltyType: updates.penaltyType,
				penaltyValue: updates.penaltyValue,
				allowExceptions: updates.allowExceptions,
				exceptionConditions: updates.exceptionConditions
					? JSON.stringify(updates.exceptionConditions)
					: undefined,
			},
		});
	}

	/**
	 * Delete (deactivate) a policy
	 */
	async deletePolicy(policyId: string) {
		const policy = await this.deps.db.bookingPolicy.findUnique({
			where: { id: policyId },
			include: { service: true },
		});

		if (!policy) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Policy not found",
			});
		}

		if (policy.service.providerId !== this.deps.currentUserId) {
			throw new TRPCError({
				code: "UNAUTHORIZED",
				message: "You can only delete your own policies",
			});
		}

		await this.deps.db.bookingPolicy.update({
			where: { id: policyId },
			data: { isActive: false },
		});

		return { success: true };
	}

	/**
	 * Get policy templates
	 */
	getPolicyTemplates() {
		return [
			{
				type: "cancellation",
				name: "Política de Cancelamento Padrão",
				description:
					"Cancelamentos devem ser feitos com antecedência mínima, caso contrário será cobrada uma taxa.",
				hoursBeforeBooking: 24,
				penaltyType: "percentage",
				penaltyValue: 50,
			},
			{
				type: "cancellation",
				name: "Política de Cancelamento Flexível",
				description: "Cancelamento gratuito até 2 horas antes do agendamento.",
				hoursBeforeBooking: 2,
				penaltyType: "none",
				penaltyValue: 0,
			},
			{
				type: "rescheduling",
				name: "Política de Reagendamento",
				description:
					"Reagendamentos devem ser feitos com 12 horas de antecedência.",
				hoursBeforeBooking: 12,
				penaltyType: "none",
				penaltyValue: 0,
			},
			{
				type: "no-show",
				name: "Política de Não Comparecimento",
				description:
					"Em caso de não comparecimento, será cobrado o valor total do serviço.",
				hoursBeforeBooking: 0,
				penaltyType: "percentage",
				penaltyValue: 100,
			},
		];
	}
}
