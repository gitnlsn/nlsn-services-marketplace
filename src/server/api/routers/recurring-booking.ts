import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { createRecurringBookingService } from "~/server/services/recurring-booking-service";

export const recurringBookingRouter = createTRPCRouter({
	/**
	 * Create a recurring booking series
	 */
	create: protectedProcedure
		.input(
			z.object({
				serviceId: z.string().cuid(),
				frequency: z.enum(["daily", "weekly", "biweekly", "monthly"]),
				interval: z.number().min(1).default(1),
				startDate: z.date(),
				endDate: z.date().optional(),
				occurrences: z.number().min(1).max(52).optional(),
				daysOfWeek: z.array(z.number().min(0).max(6)).optional(),
				dayOfMonth: z.number().min(1).max(31).optional(),
				timeSlot: z.string().regex(/^\d{2}:\d{2}$/), // HH:MM format
				duration: z.number().min(15), // Duration in minutes
				notes: z.string().optional(),
				address: z.string().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const service = createRecurringBookingService({
				db: ctx.db,
				currentUserId: ctx.session.user.id,
			});

			return await service.createRecurringBooking(input);
		}),

	/**
	 * Get user's recurring bookings
	 */
	list: protectedProcedure.query(async ({ ctx }) => {
		const service = createRecurringBookingService({
			db: ctx.db,
			currentUserId: ctx.session.user.id,
		});

		return await service.getUserRecurringBookings(ctx.session.user.id);
	}),

	/**
	 * Get details of a recurring booking
	 */
	getDetails: protectedProcedure
		.input(z.object({ id: z.string().cuid() }))
		.query(async ({ ctx, input }) => {
			const service = createRecurringBookingService({
				db: ctx.db,
				currentUserId: ctx.session.user.id,
			});

			return await service.getRecurringBookingDetails(input.id);
		}),

	/**
	 * Pause a recurring booking
	 */
	pause: protectedProcedure
		.input(z.object({ id: z.string().cuid() }))
		.mutation(async ({ ctx, input }) => {
			const service = createRecurringBookingService({
				db: ctx.db,
				currentUserId: ctx.session.user.id,
			});

			return await service.pauseRecurringBooking(input.id);
		}),

	/**
	 * Resume a paused recurring booking
	 */
	resume: protectedProcedure
		.input(
			z.object({
				id: z.string().cuid(),
				fromDate: z.date(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const service = createRecurringBookingService({
				db: ctx.db,
				currentUserId: ctx.session.user.id,
			});

			return await service.resumeRecurringBooking(input.id, input.fromDate);
		}),

	/**
	 * Cancel a recurring booking
	 */
	cancel: protectedProcedure
		.input(
			z.object({
				id: z.string().cuid(),
				cancelFutureOnly: z.boolean().default(true),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const service = createRecurringBookingService({
				db: ctx.db,
				currentUserId: ctx.session.user.id,
			});

			return await service.cancelRecurringBooking(
				input.id,
				input.cancelFutureOnly,
			);
		}),
});
