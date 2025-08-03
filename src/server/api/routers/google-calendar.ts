import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { createGoogleCalendarService } from "~/server/services/google-calendar-service";

export const googleCalendarRouter = createTRPCRouter({
	/**
	 * Check if Google Calendar is connected
	 */
	isConnected: protectedProcedure.query(async ({ ctx }) => {
		const calendarService = createGoogleCalendarService({
			db: ctx.db,
			userId: ctx.session.user.id,
		});
		return await calendarService.isConnected();
	}),

	/**
	 * List user's calendars
	 */
	listCalendars: protectedProcedure.query(async ({ ctx }) => {
		const calendarService = createGoogleCalendarService({
			db: ctx.db,
			userId: ctx.session.user.id,
		});
		return await calendarService.listCalendars();
	}),

	/**
	 * Get events from calendar
	 */
	getEvents: protectedProcedure
		.input(
			z.object({
				calendarId: z.string().default("primary"),
				startDate: z.date(),
				endDate: z.date(),
			}),
		)
		.query(async ({ ctx, input }) => {
			const calendarService = createGoogleCalendarService({
				db: ctx.db,
				userId: ctx.session.user.id,
			});
			return await calendarService.getEvents(
				input.calendarId,
				input.startDate,
				input.endDate,
			);
		}),

	/**
	 * Get free/busy information
	 */
	getFreeBusy: protectedProcedure
		.input(
			z.object({
				startDate: z.date(),
				endDate: z.date(),
				calendarId: z.string().default("primary"),
			}),
		)
		.query(async ({ ctx, input }) => {
			const calendarService = createGoogleCalendarService({
				db: ctx.db,
				userId: ctx.session.user.id,
			});
			return await calendarService.getFreeBusy(
				input.startDate,
				input.endDate,
				input.calendarId,
			);
		}),

	/**
	 * Sync availability from Google Calendar
	 */
	syncAvailability: protectedProcedure
		.input(
			z.object({
				calendarId: z.string().default("primary"),
				startDate: z.date(),
				endDate: z.date(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const calendarService = createGoogleCalendarService({
				db: ctx.db,
				userId: ctx.session.user.id,
			});
			return await calendarService.syncAvailabilityFromCalendar(
				input.calendarId,
				input.startDate,
				input.endDate,
			);
		}),

	/**
	 * Create calendar event for a booking
	 */
	createBookingEvent: protectedProcedure
		.input(
			z.object({
				bookingId: z.string().cuid(),
				calendarId: z.string().default("primary"),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// Get booking details
			const booking = await ctx.db.booking.findUnique({
				where: { id: input.bookingId },
				include: {
					service: true,
					client: true,
				},
			});

			if (!booking) {
				throw new Error("Booking not found");
			}

			// Verify the user owns this booking
			if (booking.providerId !== ctx.session.user.id) {
				throw new Error("Unauthorized");
			}

			const calendarService = createGoogleCalendarService({
				db: ctx.db,
				userId: ctx.session.user.id,
			});

			return await calendarService.createBookingEvent(
				booking,
				input.calendarId,
			);
		}),

	/**
	 * Update calendar event
	 */
	updateBookingEvent: protectedProcedure
		.input(
			z.object({
				eventId: z.string(),
				calendarId: z.string().default("primary"),
				updates: z.object({
					summary: z.string().optional(),
					description: z.string().optional(),
					start: z
						.object({
							dateTime: z.string(),
							timeZone: z.string().default("America/Sao_Paulo"),
						})
						.optional(),
					end: z
						.object({
							dateTime: z.string(),
							timeZone: z.string().default("America/Sao_Paulo"),
						})
						.optional(),
				}),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const calendarService = createGoogleCalendarService({
				db: ctx.db,
				userId: ctx.session.user.id,
			});

			return await calendarService.updateBookingEvent(
				input.eventId,
				input.updates,
				input.calendarId,
			);
		}),

	/**
	 * Delete calendar event
	 */
	deleteBookingEvent: protectedProcedure
		.input(
			z.object({
				eventId: z.string(),
				calendarId: z.string().default("primary"),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const calendarService = createGoogleCalendarService({
				db: ctx.db,
				userId: ctx.session.user.id,
			});

			return await calendarService.deleteBookingEvent(
				input.eventId,
				input.calendarId,
			);
		}),
});
