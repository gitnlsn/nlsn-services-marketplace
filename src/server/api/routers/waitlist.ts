import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { WaitlistService } from "~/server/services/waitlist-service";

export const waitlistRouter = createTRPCRouter({
	/**
	 * Join a waitlist for a service
	 */
	join: protectedProcedure
		.input(
			z.object({
				serviceId: z.string().cuid(),
				preferredDate: z.date(),
				preferredTime: z
					.string()
					.regex(/^\d{2}:\d{2}$/)
					.optional(),
				alternativeDates: z.array(z.date()).optional(),
				duration: z.number().min(15).optional(),
				notes: z.string().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const service = new WaitlistService({
				db: ctx.db,
				currentUserId: ctx.session.user.id,
			});

			return await service.joinWaitlist(input);
		}),

	/**
	 * Leave a waitlist
	 */
	leave: protectedProcedure
		.input(z.object({ serviceId: z.string().cuid() }))
		.mutation(async ({ ctx, input }) => {
			const service = new WaitlistService({
				db: ctx.db,
				currentUserId: ctx.session.user.id,
			});

			return await service.leaveWaitlist(input.serviceId);
		}),

	/**
	 * Get waitlist entries for a service (provider only)
	 */
	getServiceWaitlist: protectedProcedure
		.input(z.object({ serviceId: z.string().cuid() }))
		.query(async ({ ctx, input }) => {
			const service = new WaitlistService({
				db: ctx.db,
				currentUserId: ctx.session.user.id,
			});

			return await service.getServiceWaitlist(input.serviceId);
		}),

	/**
	 * Get user's waitlist entries
	 */
	myWaitlists: protectedProcedure.query(async ({ ctx }) => {
		const service = new WaitlistService({
			db: ctx.db,
			currentUserId: ctx.session.user.id,
		});

		return await service.getUserWaitlists();
	}),

	/**
	 * Notify waitlist about availability
	 */
	notifyAvailability: protectedProcedure
		.input(
			z.object({
				waitlistId: z.string().cuid(),
				availableDate: z.date(),
				availableTime: z.string().regex(/^\d{2}:\d{2}$/),
				expiresInHours: z.number().min(1).max(168).default(24),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const service = new WaitlistService({
				db: ctx.db,
				currentUserId: ctx.session.user.id,
			});

			return await service.notifyWaitlistAvailability(input);
		}),

	/**
	 * Update waitlist priority
	 */
	updatePriority: protectedProcedure
		.input(
			z.object({
				waitlistId: z.string().cuid(),
				priority: z.number().min(0).max(10),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const service = new WaitlistService({
				db: ctx.db,
				currentUserId: ctx.session.user.id,
			});

			return await service.updateWaitlistPriority(
				input.waitlistId,
				input.priority,
			);
		}),

	/**
	 * Convert waitlist entry to booking
	 */
	convertToBooking: protectedProcedure
		.input(
			z.object({
				waitlistId: z.string().cuid(),
				bookingDate: z.date(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const service = new WaitlistService({
				db: ctx.db,
				currentUserId: ctx.session.user.id,
			});

			return await service.convertToBooking(
				input.waitlistId,
				input.bookingDate,
			);
		}),

	/**
	 * Get waitlist statistics
	 */
	getStats: protectedProcedure
		.input(z.object({ providerId: z.string().cuid().optional() }).optional())
		.query(async ({ ctx, input }) => {
			const service = new WaitlistService({
				db: ctx.db,
				currentUserId: ctx.session.user.id,
			});

			return await service.getWaitlistStats(input?.providerId);
		}),
});
