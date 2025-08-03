import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { GroupBookingService } from "~/server/services/group-booking-service";

export const groupBookingRouter = createTRPCRouter({
	/**
	 * Create a new group booking
	 */
	create: protectedProcedure
		.input(
			z.object({
				serviceId: z.string().cuid(),
				name: z.string().min(3).max(100),
				description: z.string().optional(),
				maxParticipants: z.number().min(2).max(100),
				minParticipants: z.number().min(1).optional(),
				bookingDate: z.date(),
				endDate: z.date(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const service = new GroupBookingService({
				db: ctx.db,
				currentUserId: ctx.session.user.id,
			});

			return await service.createGroupBooking(input);
		}),

	/**
	 * Join an existing group booking
	 */
	join: protectedProcedure
		.input(
			z.object({
				groupBookingId: z.string().cuid(),
				notes: z.string().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const service = new GroupBookingService({
				db: ctx.db,
				currentUserId: ctx.session.user.id,
			});

			return await service.joinGroupBooking(input);
		}),

	/**
	 * Leave a group booking
	 */
	leave: protectedProcedure
		.input(z.object({ groupBookingId: z.string().cuid() }))
		.mutation(async ({ ctx, input }) => {
			const service = new GroupBookingService({
				db: ctx.db,
				currentUserId: ctx.session.user.id,
			});

			return await service.leaveGroupBooking(input.groupBookingId);
		}),

	/**
	 * Get group booking details
	 */
	getDetails: protectedProcedure
		.input(z.object({ id: z.string().cuid() }))
		.query(async ({ ctx, input }) => {
			const service = new GroupBookingService({
				db: ctx.db,
				currentUserId: ctx.session.user.id,
			});

			return await service.getGroupBookingDetails(input.id);
		}),

	/**
	 * List available group bookings
	 */
	listAvailable: protectedProcedure
		.input(
			z
				.object({
					categoryId: z.string().cuid().optional(),
					city: z.string().optional(),
					startDate: z.date().optional(),
					endDate: z.date().optional(),
				})
				.optional(),
		)
		.query(async ({ ctx, input }) => {
			const service = new GroupBookingService({
				db: ctx.db,
				currentUserId: ctx.session.user.id,
			});

			return await service.listAvailableGroupBookings(input);
		}),

	/**
	 * Cancel a group booking (organizer only)
	 */
	cancel: protectedProcedure
		.input(
			z.object({
				id: z.string().cuid(),
				reason: z.string().min(10),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const service = new GroupBookingService({
				db: ctx.db,
				currentUserId: ctx.session.user.id,
			});

			return await service.cancelGroupBooking(input.id, input.reason);
		}),

	/**
	 * Get user's group bookings (as organizer or participant)
	 */
	myGroups: protectedProcedure.query(async ({ ctx }) => {
		const organized = await ctx.db.groupBooking.findMany({
			where: {
				organizerId: ctx.session.user.id,
			},
			include: {
				service: {
					include: {
						category: true,
						images: true,
					},
				},
				_count: {
					select: {
						bookings: {
							where: {
								status: { notIn: ["cancelled", "declined"] },
							},
						},
					},
				},
			},
			orderBy: { bookingDate: "asc" },
		});

		const participating = await ctx.db.booking.findMany({
			where: {
				clientId: ctx.session.user.id,
				groupBookingId: { not: null },
				status: { notIn: ["cancelled", "declined"] },
			},
			include: {
				groupBooking: {
					include: {
						service: {
							include: {
								category: true,
								images: true,
							},
						},
						organizer: {
							select: {
								id: true,
								name: true,
								image: true,
							},
						},
						_count: {
							select: {
								bookings: {
									where: {
										status: { notIn: ["cancelled", "declined"] },
									},
								},
							},
						},
					},
				},
			},
			orderBy: { bookingDate: "asc" },
		});

		return {
			organized,
			participating: participating
				.filter((b) => b.groupBooking)
				.map((b) => b.groupBooking)
				.filter((gb) => gb !== null),
		};
	}),
});
