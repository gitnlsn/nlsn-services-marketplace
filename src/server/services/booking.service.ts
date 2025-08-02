import type { PrismaClient } from "@prisma/client";
import { TRPCError } from "@trpc/server";

export interface BookingCreateData {
	serviceId: string;
	bookingDate: Date;
	endDate?: Date;
	notes?: string;
	address?: string;
}

export interface BookingUpdateStatusData {
	bookingId: string;
	status: "completed" | "cancelled";
	reason?: string;
}

export interface BookingListFilters {
	role: "client" | "provider";
	status?: "pending" | "accepted" | "declined" | "completed" | "cancelled";
	limit?: number;
	cursor?: string;
}

export class BookingService {
	constructor(private db: PrismaClient) {}

	async createBooking(userId: string, data: BookingCreateData) {
		// Verify service exists and get details
		const service = await this.db.service.findUnique({
			where: { id: data.serviceId },
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
		if (service.providerId === userId) {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: "Cannot book your own service",
			});
		}

		// Calculate total price based on service type
		let totalPrice = service.price;
		if (service.priceType === "hourly" && data.endDate) {
			const hours = Math.ceil(
				(data.endDate.getTime() - data.bookingDate.getTime()) /
					(1000 * 60 * 60),
			);
			totalPrice = service.price * hours;
		}

		// Check for booking conflicts if service has max bookings
		if (service.maxBookings) {
			const existingBookings = await this.db.booking.count({
				where: {
					serviceId: service.id,
					bookingDate: {
						gte: new Date(data.bookingDate.toDateString()),
						lt: new Date(
							new Date(data.bookingDate).setDate(
								data.bookingDate.getDate() + 1,
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
		const booking = await this.db.booking.create({
			data: {
				serviceId: service.id,
				clientId: userId,
				providerId: service.providerId,
				bookingDate: data.bookingDate,
				endDate: data.endDate,
				totalPrice,
				notes: data.notes,
				address: data.address ?? service.location,
				status: "pending",
			},
		});

		// Create payment record
		const payment = await this.db.payment.create({
			data: {
				bookingId: booking.id,
				amount: totalPrice,
				status: "pending",
				serviceFee: totalPrice * 0.1, // 10% platform fee
				netAmount: totalPrice * 0.9,
			},
		});

		// Create notification for provider
		await this.db.notification.create({
			data: {
				userId: service.providerId,
				type: "new_booking",
				title: "New Booking Request",
				message: `You have a new booking request for ${service.title}`,
			},
		});

		// Increment service booking count
		await this.db.service.update({
			where: { id: service.id },
			data: { bookingCount: { increment: 1 } },
		});

		return { booking, payment };
	}

	async acceptBooking(userId: string, bookingId: string) {
		const booking = await this.db.booking.findUnique({
			where: { id: bookingId },
			include: { service: true, client: true },
		});

		if (!booking) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Booking not found",
			});
		}

		// Verify user is the provider
		if (booking.providerId !== userId) {
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
		const updatedBooking = await this.db.booking.update({
			where: { id: booking.id },
			data: { status: "accepted" },
		});

		// Create notification for client
		await this.db.notification.create({
			data: {
				userId: booking.clientId,
				type: "booking_accepted",
				title: "Booking Accepted",
				message: `Your booking for ${booking.service.title} has been accepted`,
			},
		});

		return updatedBooking;
	}

	async declineBooking(userId: string, bookingId: string, reason?: string) {
		const booking = await this.db.booking.findUnique({
			where: { id: bookingId },
			include: { service: true, payment: true },
		});

		if (!booking) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Booking not found",
			});
		}

		// Verify user is the provider
		if (booking.providerId !== userId) {
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
		const updatedBooking = await this.db.booking.update({
			where: { id: booking.id },
			data: {
				status: "declined",
				cancellationReason: reason,
				cancelledBy: userId,
			},
		});

		// Update payment status if exists
		if (booking.payment) {
			await this.db.payment.update({
				where: { id: booking.payment.id },
				data: { status: "failed" },
			});
		}

		// Create notification for client
		await this.db.notification.create({
			data: {
				userId: booking.clientId,
				type: "booking_declined",
				title: "Booking Declined",
				message: `Your booking for ${booking.service.title} has been declined${
					reason ? `: ${reason}` : ""
				}`,
			},
		});

		// Decrement service booking count
		await this.db.service.update({
			where: { id: booking.serviceId },
			data: { bookingCount: { decrement: 1 } },
		});

		return updatedBooking;
	}

	async getBookingById(userId: string, bookingId: string) {
		const booking = await this.db.booking.findUnique({
			where: { id: bookingId },
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
		if (booking.clientId !== userId && booking.providerId !== userId) {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: "You don't have permission to view this booking",
			});
		}

		return booking;
	}

	async updateBookingStatus(userId: string, data: BookingUpdateStatusData) {
		const booking = await this.db.booking.findUnique({
			where: { id: data.bookingId },
			include: { service: true, payment: true },
		});

		if (!booking) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Booking not found",
			});
		}

		// Determine who can update status
		const isClient = booking.clientId === userId;
		const isProvider = booking.providerId === userId;

		if (!isClient && !isProvider) {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: "You don't have permission to update this booking",
			});
		}

		// Validate status transitions
		if (data.status === "completed") {
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

		if (data.status === "cancelled") {
			if (!["pending", "accepted"].includes(booking.status)) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "This booking cannot be cancelled",
				});
			}
		}

		// Update booking
		const updatedBooking = await this.db.booking.update({
			where: { id: booking.id },
			data: {
				status: data.status,
				completedAt: data.status === "completed" ? new Date() : undefined,
				cancellationReason:
					data.status === "cancelled" ? data.reason : undefined,
				cancelledBy: data.status === "cancelled" ? userId : undefined,
			},
		});

		// Handle payment updates for completed bookings
		if (data.status === "completed" && booking.payment) {
			const escrowReleaseDate = new Date();
			escrowReleaseDate.setDate(escrowReleaseDate.getDate() + 15); // 15 days escrow

			await this.db.payment.update({
				where: { id: booking.payment.id },
				data: {
					status: "paid",
					escrowReleaseDate,
				},
			});

			// Create notification for client to review
			await this.db.notification.create({
				data: {
					userId: booking.clientId,
					type: "service_completed",
					title: "Service Completed",
					message: `${booking.service.title} has been completed. Please leave a review!`,
				},
			});
		}

		// Handle payment updates for cancelled bookings
		if (data.status === "cancelled" && booking.payment) {
			await this.db.payment.update({
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
			data.status === "completed" ? "booking_completed" : "booking_cancelled";
		const notificationTitle =
			data.status === "completed" ? "Booking Completed" : "Booking Cancelled";

		await this.db.notification.create({
			data: {
				userId: notificationUserId,
				type: notificationType,
				title: notificationTitle,
				message: `Booking for ${booking.service.title} has been ${data.status}${
					data.reason ? `: ${data.reason}` : ""
				}`,
			},
		});

		return updatedBooking;
	}

	async listBookings(userId: string, filters: BookingListFilters) {
		const where: { clientId?: string; providerId?: string; status?: string } =
			filters.role === "client" ? { clientId: userId } : { providerId: userId };

		if (filters.status) {
			where.status = filters.status;
		}

		const limit = filters.limit ?? 20;
		const bookings = await this.db.booking.findMany({
			where,
			take: limit + 1,
			cursor: filters.cursor ? { id: filters.cursor } : undefined,
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

		let nextCursor: string | undefined = undefined;
		if (bookings.length > limit) {
			const nextItem = bookings.pop();
			nextCursor = nextItem?.id;
		}

		return {
			bookings,
			nextCursor,
		};
	}
}
