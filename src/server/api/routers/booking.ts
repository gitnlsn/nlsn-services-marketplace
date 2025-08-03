import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import {
	acceptBookingSchema,
	createBookingSchema,
	createBookingService,
	declineBookingSchema,
	getBookingSchema,
	listBookingsSchema,
	updateBookingStatusSchema,
} from "~/server/services/booking-service";

export const bookingRouter = createTRPCRouter({
	// Create a new booking
	create: protectedProcedure
		.input(createBookingSchema)
		.mutation(async ({ ctx, input }) => {
			const currentUser = await ctx.db.user.findUnique({
				where: { id: ctx.session.user.id },
			});
			if (!currentUser) {
				throw new Error("User not found");
			}
			const bookingService = createBookingService({
				db: ctx.db,
				currentUser,
			});
			return await bookingService.createBooking(input);
		}),

	// Accept a booking (professional only)
	accept: protectedProcedure
		.input(acceptBookingSchema)
		.mutation(async ({ ctx, input }) => {
			const currentUser = await ctx.db.user.findUnique({
				where: { id: ctx.session.user.id },
			});
			if (!currentUser) {
				throw new Error("User not found");
			}
			const bookingService = createBookingService({
				db: ctx.db,
				currentUser,
			});
			return await bookingService.acceptBooking(input);
		}),

	// Decline a booking (professional only)
	decline: protectedProcedure
		.input(declineBookingSchema)
		.mutation(async ({ ctx, input }) => {
			const currentUser = await ctx.db.user.findUnique({
				where: { id: ctx.session.user.id },
			});
			if (!currentUser) {
				throw new Error("User not found");
			}
			const bookingService = createBookingService({
				db: ctx.db,
				currentUser,
			});
			return await bookingService.declineBooking(input);
		}),

	// Get booking details
	getById: protectedProcedure
		.input(getBookingSchema)
		.query(async ({ ctx, input }) => {
			const currentUser = await ctx.db.user.findUnique({
				where: { id: ctx.session.user.id },
			});
			if (!currentUser) {
				throw new Error("User not found");
			}
			const bookingService = createBookingService({
				db: ctx.db,
				currentUser,
			});
			return await bookingService.getBooking(input);
		}),

	// Update booking status (complete or cancel)
	updateStatus: protectedProcedure
		.input(updateBookingStatusSchema)
		.mutation(async ({ ctx, input }) => {
			const currentUser = await ctx.db.user.findUnique({
				where: { id: ctx.session.user.id },
			});
			if (!currentUser) {
				throw new Error("User not found");
			}
			const bookingService = createBookingService({
				db: ctx.db,
				currentUser,
			});
			return await bookingService.updateBookingStatus(input);
		}),

	// List bookings for current user
	list: protectedProcedure
		.input(listBookingsSchema)
		.query(async ({ ctx, input }) => {
			const currentUser = await ctx.db.user.findUnique({
				where: { id: ctx.session.user.id },
			});
			if (!currentUser) {
				throw new Error("User not found");
			}
			const bookingService = createBookingService({
				db: ctx.db,
				currentUser,
			});
			return await bookingService.listBookings(input);
		}),
});
