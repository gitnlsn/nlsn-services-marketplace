import type { PrismaClient, User } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

// Input schemas
export const createBookingSchema = z.object({
	serviceId: z.string().cuid(),
	bookingDate: z.date(),
	endDate: z.date().optional(),
	notes: z.string().optional(),
	address: z.string().optional(),
});

export const acceptBookingSchema = z.object({
	bookingId: z.string().cuid(),
});

export const declineBookingSchema = z.object({
	bookingId: z.string().cuid(),
	reason: z.string().optional(),
});

export const getBookingSchema = z.object({
	bookingId: z.string().cuid(),
});

export const updateBookingStatusSchema = z.object({
	bookingId: z.string().cuid(),
	status: z.enum(["completed", "cancelled"]),
	reason: z.string().optional(),
});

export const listBookingsSchema = z.object({
	role: z.enum(["client", "provider"]),
	status: z
		.enum(["pending", "accepted", "declined", "completed", "cancelled"])
		.optional(),
	limit: z.number().min(1).max(100).default(20),
	cursor: z.string().optional(),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type AcceptBookingInput = z.infer<typeof acceptBookingSchema>;
export type DeclineBookingInput = z.infer<typeof declineBookingSchema>;
export type GetBookingInput = z.infer<typeof getBookingSchema>;
export type UpdateBookingStatusInput = z.infer<
	typeof updateBookingStatusSchema
>;
export type ListBookingsInput = z.infer<typeof listBookingsSchema>;

// Dependencies interface
interface BookingServiceDependencies {
	db: PrismaClient;
	currentUser: User;
}

export class BookingService {
	constructor(private deps: BookingServiceDependencies) {}

	async createBooking(input: CreateBookingInput) {
		// Verify service exists and get details
		const service = await this.deps.db.service.findUnique({
			where: { id: input.serviceId },
			include: { provider: true },
		});

		if (!service) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Service not found",
			});
		}

		if (service.status !== "active") {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: "Service is not available for booking",
			});
		}

		// Prevent booking own service
		if (service.providerId === this.deps.currentUser.id) {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: "Cannot book your own service",
			});
		}

		// Calculate total price based on service type
		let totalPrice = service.price;
		if (service.priceType === "hourly" && input.endDate) {
			const hours = Math.ceil(
				(input.endDate.getTime() - input.bookingDate.getTime()) /
					(1000 * 60 * 60),
			);
			totalPrice = service.price * hours;
		}

		// Check for booking conflicts if service has max bookings
		if (service.maxBookings) {
			const existingBookings = await this.deps.db.booking.count({
				where: {
					serviceId: service.id,
					bookingDate: {
						gte: new Date(input.bookingDate.toDateString()),
						lt: new Date(
							new Date(input.bookingDate).setDate(
								input.bookingDate.getDate() + 1,
							),
						),
					},
					status: {
						in: ["pending", "accepted"],
					},
				},
			});

			if (existingBookings >= service.maxBookings) {
				throw new TRPCError({
					code: "CONFLICT",
					message: "Service is fully booked for this date",
				});
			}
		}

		// Create booking
		const booking = await this.deps.db.booking.create({
			data: {
				serviceId: service.id,
				clientId: this.deps.currentUser.id,
				providerId: service.providerId,
				bookingDate: input.bookingDate,
				endDate: input.endDate,
				totalPrice,
				notes: input.notes,
				address: input.address ?? service.location,
				status: "pending",
			},
		});

		// Create payment record
		const payment = await this.deps.db.payment.create({
			data: {
				bookingId: booking.id,
				amount: totalPrice,
				status: "pending",
				serviceFee: totalPrice * 0.1, // 10% platform fee
				netAmount: totalPrice * 0.9,
			},
		});

		// Create notification for provider
		await this.deps.db.notification.create({
			data: {
				userId: service.providerId,
				type: "new_booking",
				title: "New Booking Request",
				message: `You have a new booking request for ${service.title}`,
			},
		});

		// Increment service booking count
		await this.deps.db.service.update({
			where: { id: service.id },
			data: { bookingCount: { increment: 1 } },
		});

		return { booking, payment };
	}

	async acceptBooking(input: AcceptBookingInput) {
		const booking = await this.deps.db.booking.findUnique({
			where: { id: input.bookingId },
			include: { service: true, client: true },
		});

		if (!booking) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Booking not found",
			});
		}

		// Verify user is the provider
		if (booking.providerId !== this.deps.currentUser.id) {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: "Only the service provider can accept this booking",
			});
		}

		if (booking.status !== "pending") {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: "Booking is not in pending status",
			});
		}

		// Update booking status
		const updatedBooking = await this.deps.db.booking.update({
			where: { id: booking.id },
			data: { status: "accepted" },
		});

		// Create notification for client
		await this.deps.db.notification.create({
			data: {
				userId: booking.clientId,
				type: "booking_accepted",
				title: "Booking Accepted",
				message: `Your booking for ${booking.service.title} has been accepted`,
			},
		});

		return updatedBooking;
	}

	async declineBooking(input: DeclineBookingInput) {
		const booking = await this.deps.db.booking.findUnique({
			where: { id: input.bookingId },
			include: { service: true, payment: true },
		});

		if (!booking) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Booking not found",
			});
		}

		// Verify user is the provider
		if (booking.providerId !== this.deps.currentUser.id) {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: "Only the service provider can decline this booking",
			});
		}

		if (booking.status !== "pending") {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: "Booking is not in pending status",
			});
		}

		// Update booking status
		const updatedBooking = await this.deps.db.booking.update({
			where: { id: booking.id },
			data: {
				status: "declined",
				cancellationReason: input.reason,
				cancelledBy: this.deps.currentUser.id,
			},
		});

		// Update payment status if exists
		if (booking.payment) {
			await this.deps.db.payment.update({
				where: { id: booking.payment.id },
				data: { status: "failed" },
			});
		}

		// Create notification for client
		await this.deps.db.notification.create({
			data: {
				userId: booking.clientId,
				type: "booking_declined",
				title: "Booking Declined",
				message: `Your booking for ${booking.service.title} has been declined${
					input.reason ? `: ${input.reason}` : ""
				}`,
			},
		});

		// Decrement service booking count
		await this.deps.db.service.update({
			where: { id: booking.serviceId },
			data: { bookingCount: { decrement: 1 } },
		});

		return updatedBooking;
	}

	async getBooking(input: GetBookingInput) {
		const booking = await this.deps.db.booking.findUnique({
			where: { id: input.bookingId },
			include: {
				service: {
					include: {
						provider: {
							select: {
								id: true,
								name: true,
								email: true,
								image: true,
								phone: true,
							},
						},
						category: true,
						images: true,
					},
				},
				client: {
					select: {
						id: true,
						name: true,
						email: true,
						image: true,
						phone: true,
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

		// Verify user is either client or provider
		if (
			booking.clientId !== this.deps.currentUser.id &&
			booking.providerId !== this.deps.currentUser.id
		) {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: "You don't have permission to view this booking",
			});
		}

		return booking;
	}

	async updateBookingStatus(input: UpdateBookingStatusInput) {
		const booking = await this.deps.db.booking.findUnique({
			where: { id: input.bookingId },
			include: { service: true, payment: true },
		});

		if (!booking) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Booking not found",
			});
		}

		// Determine who can update status
		const isClient = booking.clientId === this.deps.currentUser.id;
		const isProvider = booking.providerId === this.deps.currentUser.id;

		if (!isClient && !isProvider) {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: "You don't have permission to update this booking",
			});
		}

		// Validate status transitions
		if (input.status === "completed") {
			if (!isProvider) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Only the service provider can mark a booking as completed",
				});
			}
			if (booking.status !== "accepted") {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Only accepted bookings can be marked as completed",
				});
			}
		}

		if (input.status === "cancelled") {
			if (!["pending", "accepted"].includes(booking.status)) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "This booking cannot be cancelled",
				});
			}
		}

		// Update booking
		const updatedBooking = await this.deps.db.booking.update({
			where: { id: booking.id },
			data: {
				status: input.status,
				completedAt: input.status === "completed" ? new Date() : undefined,
				cancellationReason:
					input.status === "cancelled" ? input.reason : undefined,
				cancelledBy:
					input.status === "cancelled" ? this.deps.currentUser.id : undefined,
			},
		});

		// Handle payment updates for completed bookings
		if (input.status === "completed" && booking.payment) {
			const escrowReleaseDate = new Date();
			escrowReleaseDate.setDate(escrowReleaseDate.getDate() + 15); // 15 days escrow

			await this.deps.db.payment.update({
				where: { id: booking.payment.id },
				data: {
					status: "paid",
					escrowReleaseDate,
				},
			});

			// Create notification for client to review
			await this.deps.db.notification.create({
				data: {
					userId: booking.clientId,
					type: "service_completed",
					title: "Service Completed",
					message: `${booking.service.title} has been completed. Please leave a review!`,
				},
			});
		}

		// Handle payment updates for cancelled bookings
		if (input.status === "cancelled" && booking.payment) {
			await this.deps.db.payment.update({
				where: { id: booking.payment.id },
				data: {
					status: "refunded",
					refundAmount: booking.payment.amount,
					refundedAt: new Date(),
				},
			});
		}

		// Create notifications
		const notificationUserId = isClient ? booking.providerId : booking.clientId;
		const notificationType =
			input.status === "completed" ? "booking_completed" : "booking_cancelled";
		const notificationTitle =
			input.status === "completed" ? "Booking Completed" : "Booking Cancelled";

		await this.deps.db.notification.create({
			data: {
				userId: notificationUserId,
				type: notificationType,
				title: notificationTitle,
				message: `Booking for ${booking.service.title} has been ${input.status}${
					input.reason ? `: ${input.reason}` : ""
				}`,
			},
		});

		return updatedBooking;
	}

	async listBookings(input: ListBookingsInput) {
		const where: { clientId?: string; providerId?: string; status?: string } =
			input.role === "client"
				? { clientId: this.deps.currentUser.id }
				: { providerId: this.deps.currentUser.id };

		if (input.status) {
			where.status = input.status;
		}

		const bookings = await this.deps.db.booking.findMany({
			where,
			take: input.limit + 1,
			cursor: input.cursor ? { id: input.cursor } : undefined,
			orderBy: { createdAt: "desc" },
			include: {
				service: {
					include: {
						category: true,
						images: { take: 1 },
					},
				},
				client: {
					select: {
						id: true,
						name: true,
						image: true,
					},
				},
				provider: {
					select: {
						id: true,
						name: true,
						image: true,
					},
				},
			},
		});

		let nextCursor: typeof input.cursor | undefined = undefined;
		if (bookings.length > input.limit) {
			const nextItem = bookings.pop();
			nextCursor = nextItem?.id;
		}

		return {
			bookings,
			nextCursor,
		};
	}
}

// Export factory function for easy instantiation
export const createBookingService = (deps: BookingServiceDependencies) =>
	new BookingService(deps);
