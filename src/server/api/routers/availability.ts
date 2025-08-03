import { z } from "zod";
import {
	createTRPCRouter,
	protectedProcedure,
	publicProcedure,
} from "~/server/api/trpc";
import {
	bookTimeSlotSchema,
	createAvailabilityService,
	generateTimeSlotsSchema,
	getAvailabilitySchema,
	getAvailableTimeSlotsSchema,
	removeAvailabilitySchema,
	setAvailabilitySchema,
} from "~/server/services/availability-service";

export const availabilityRouter = createTRPCRouter({
	/**
	 * Set weekly availability (protected - professionals only)
	 */
	setAvailability: protectedProcedure
		.input(setAvailabilitySchema)
		.mutation(async ({ ctx, input }) => {
			const availabilityService = createAvailabilityService({
				db: ctx.db,
				currentUser: ctx.session.user,
			});
			return await availabilityService.setAvailability(input);
		}),

	/**
	 * Remove availability slot (protected)
	 */
	removeAvailability: protectedProcedure
		.input(removeAvailabilitySchema)
		.mutation(async ({ ctx, input }) => {
			const availabilityService = createAvailabilityService({
				db: ctx.db,
				currentUser: ctx.session.user,
			});
			return await availabilityService.removeAvailability(input);
		}),

	/**
	 * Get provider's weekly availability (public)
	 */
	getAvailability: publicProcedure
		.input(getAvailabilitySchema)
		.query(async ({ ctx, input }) => {
			const currentUser = ctx.session?.user || { id: "" };
			const availabilityService = createAvailabilityService({
				db: ctx.db,
				currentUser,
			});
			return await availabilityService.getAvailability(input);
		}),

	/**
	 * Generate time slots for a date range (protected - professionals only)
	 */
	generateTimeSlots: protectedProcedure
		.input(generateTimeSlotsSchema)
		.mutation(async ({ ctx, input }) => {
			const availabilityService = createAvailabilityService({
				db: ctx.db,
				currentUser: ctx.session.user,
			});
			return await availabilityService.generateTimeSlots(input);
		}),

	/**
	 * Get available time slots for a specific date (public)
	 */
	getAvailableTimeSlots: publicProcedure
		.input(getAvailableTimeSlotsSchema)
		.query(async ({ ctx, input }) => {
			const currentUser = ctx.session?.user || { id: "" };
			const availabilityService = createAvailabilityService({
				db: ctx.db,
				currentUser,
			});
			return await availabilityService.getAvailableTimeSlots(input);
		}),

	/**
	 * Book a time slot (protected)
	 */
	bookTimeSlot: protectedProcedure
		.input(bookTimeSlotSchema)
		.mutation(async ({ ctx, input }) => {
			const availabilityService = createAvailabilityService({
				db: ctx.db,
				currentUser: ctx.session.user,
			});
			return await availabilityService.bookTimeSlot(input);
		}),

	/**
	 * Release a time slot (protected)
	 */
	releaseTimeSlot: protectedProcedure
		.input(z.object({ timeSlotId: z.string().cuid() }))
		.mutation(async ({ ctx, input }) => {
			const availabilityService = createAvailabilityService({
				db: ctx.db,
				currentUser: ctx.session.user,
			});
			return await availabilityService.releaseTimeSlot(input.timeSlotId);
		}),

	/**
	 * Get weekly schedule (protected - for providers to see their schedule)
	 */
	getWeeklySchedule: protectedProcedure
		.input(
			z.object({
				providerId: z.string().cuid().optional(),
				weekStart: z.date(),
			}),
		)
		.query(async ({ ctx, input }) => {
			const availabilityService = createAvailabilityService({
				db: ctx.db,
				currentUser: ctx.session.user,
			});
			const providerId = input.providerId || ctx.session.user.id;
			return await availabilityService.getWeeklySchedule(
				providerId,
				input.weekStart,
			);
		}),

	/**
	 * Get my availability settings (protected)
	 */
	getMyAvailability: protectedProcedure.query(async ({ ctx }) => {
		const availabilityService = createAvailabilityService({
			db: ctx.db,
			currentUser: ctx.session.user,
		});
		return await availabilityService.getAvailability({});
	}),
});
