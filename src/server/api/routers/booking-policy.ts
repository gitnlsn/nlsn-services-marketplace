import { z } from "zod";
import {
	createTRPCRouter,
	protectedProcedure,
	publicProcedure,
} from "~/server/api/trpc";
import { BookingPolicyService } from "~/server/services/booking-policy-service";

export const bookingPolicyRouter = createTRPCRouter({
	/**
	 * Create a booking policy
	 */
	create: protectedProcedure
		.input(
			z.object({
				serviceId: z.string().cuid(),
				name: z.string().min(3).max(100),
				type: z.enum(["cancellation", "rescheduling", "no-show"]),
				description: z.string().min(10),
				hoursBeforeBooking: z.number().min(0),
				penaltyType: z.enum(["none", "percentage", "fixed"]).optional(),
				penaltyValue: z.number().min(0).optional(),
				allowExceptions: z.boolean().optional(),
				exceptionConditions: z.any().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const service = new BookingPolicyService({
				db: ctx.db,
				currentUserId: ctx.session.user.id,
			});

			return await service.createPolicy(input);
		}),

	/**
	 * Get policies for a service
	 */
	getServicePolicies: publicProcedure
		.input(z.object({ serviceId: z.string().cuid() }))
		.query(async ({ ctx, input }) => {
			const service = new BookingPolicyService({
				db: ctx.db,
				currentUserId: "", // Not needed for public view
			});

			return await service.getServicePolicies(input.serviceId);
		}),

	/**
	 * Evaluate cancellation policy for a booking
	 */
	evaluateCancellation: protectedProcedure
		.input(z.object({ bookingId: z.string().cuid() }))
		.query(async ({ ctx, input }) => {
			const service = new BookingPolicyService({
				db: ctx.db,
				currentUserId: ctx.session.user.id,
			});

			return await service.evaluateCancellationPolicy(input.bookingId);
		}),

	/**
	 * Evaluate rescheduling policy for a booking
	 */
	evaluateRescheduling: protectedProcedure
		.input(
			z.object({
				bookingId: z.string().cuid(),
				newDate: z.date(),
			}),
		)
		.query(async ({ ctx, input }) => {
			const service = new BookingPolicyService({
				db: ctx.db,
				currentUserId: ctx.session.user.id,
			});

			return await service.evaluateReschedulingPolicy(
				input.bookingId,
				input.newDate,
			);
		}),

	/**
	 * Apply no-show policy
	 */
	applyNoShow: protectedProcedure
		.input(z.object({ bookingId: z.string().cuid() }))
		.mutation(async ({ ctx, input }) => {
			const service = new BookingPolicyService({
				db: ctx.db,
				currentUserId: ctx.session.user.id,
			});

			return await service.applyNoShowPolicy(input.bookingId);
		}),

	/**
	 * Update a policy
	 */
	update: protectedProcedure
		.input(
			z.object({
				policyId: z.string().cuid(),
				name: z.string().min(3).max(100).optional(),
				description: z.string().min(10).optional(),
				hoursBeforeBooking: z.number().min(0).optional(),
				penaltyType: z.enum(["none", "percentage", "fixed"]).optional(),
				penaltyValue: z.number().min(0).optional(),
				allowExceptions: z.boolean().optional(),
				exceptionConditions: z.any().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const service = new BookingPolicyService({
				db: ctx.db,
				currentUserId: ctx.session.user.id,
			});

			const { policyId, ...updates } = input;
			return await service.updatePolicy(policyId, updates);
		}),

	/**
	 * Delete a policy
	 */
	delete: protectedProcedure
		.input(z.object({ policyId: z.string().cuid() }))
		.mutation(async ({ ctx, input }) => {
			const service = new BookingPolicyService({
				db: ctx.db,
				currentUserId: ctx.session.user.id,
			});

			return await service.deletePolicy(input.policyId);
		}),

	/**
	 * Get policy templates
	 */
	getTemplates: protectedProcedure.query(async ({ ctx }) => {
		const service = new BookingPolicyService({
			db: ctx.db,
			currentUserId: ctx.session.user.id,
		});

		return service.getPolicyTemplates();
	}),
});
