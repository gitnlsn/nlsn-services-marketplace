import type { PrismaClient, User } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { wsServer } from "../websocket/websocket-server";
import { NotificationTypes, notificationService } from "./notification-service";

// Input schemas
export const createBookingSchema = z.object({
	serviceId: z.string().cuid(),
	bookingDate: z.date(),
	endDate: z.date().optional(),
	notes: z.string().optional(),
	address: z.string().optional(),
	// Advanced booking features
	isRecurring: z.boolean().optional(),
	recurringBookingId: z.string().cuid().optional(),
	groupBookingId: z.string().cuid().optional(),
	addOnIds: z.array(z.string().cuid()).optional(),
	bundleId: z.string().cuid().optional(),
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
	currentUser?: User;
	currentUserId: string;
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
		if (service.providerId === this.deps.currentUserId) {
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

		// Apply bundle discount if applicable
		if (input.bundleId) {
			const bundle = await this.deps.db.serviceBundle.findUnique({
				where: { id: input.bundleId },
				include: { services: true },
			});

			if (bundle?.services.some((s) => s.id === service.id)) {
				totalPrice = totalPrice * (1 - bundle.discount / 100);
			}
		}

		// Add add-on prices
		let addOns: Array<{
			id: string;
			price: number;
			name: string;
			serviceId: string;
		}> = [];
		if (input.addOnIds && input.addOnIds.length > 0) {
			addOns = await this.deps.db.serviceAddOn.findMany({
				where: {
					id: { in: input.addOnIds },
					serviceId: service.id,
					isActive: true,
				},
			});

			const addOnTotal = addOns.reduce((sum, addon) => sum + addon.price, 0);
			totalPrice += addOnTotal;
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
				clientId: this.deps.currentUserId,
				providerId: service.providerId,
				bookingDate: input.bookingDate,
				endDate: input.endDate,
				totalPrice,
				notes: input.notes,
				address: input.address ?? service.location,
				status: "pending",
				isRecurring: input.isRecurring || false,
				recurringBookingId: input.recurringBookingId,
				groupBookingId: input.groupBookingId,
			},
		});

		// Create booking add-ons
		if (addOns.length > 0) {
			await this.deps.db.bookingAddOn.createMany({
				data: addOns.map((addon) => ({
					bookingId: booking.id,
					addOnId: addon.id,
					price: addon.price,
				})),
			});
		}

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

		// Get current user details for notifications
		const currentUser = await this.deps.db.user.findUnique({
			where: { id: this.deps.currentUserId },
		});

		// Send notification to provider
		try {
			await notificationService.sendNotification(
				NotificationTypes.BOOKING_CREATED,
				{
					email: service.provider.email || undefined,
					phone: service.provider.phone || undefined,
					name: service.provider.name || "Profissional",
				},
				{
					serviceName: service.title,
					customerName: currentUser?.name || "Cliente",
					date: input.bookingDate.toLocaleDateString("pt-BR"),
					address: input.address || service.location || "",
				},
				["sms", "email"],
			);
		} catch (error) {
			console.error("Failed to send booking notification:", error);
			// Don't fail the booking if notification fails
		}

		// Send real-time WebSocket notification to provider
		try {
			wsServer.sendBookingUpdate(service.providerId, {
				type: "new_booking",
				bookingId: booking.id,
				serviceName: service.title,
				customerName: currentUser?.name || "Cliente",
				date: input.bookingDate.toISOString(),
				message: `Nova reserva para ${service.title}`,
			});
		} catch (error) {
			console.error("Failed to send WebSocket notification:", error);
		}

		// Schedule booking reminders
		try {
			const { BookingReminderService } = await import(
				"./booking-reminder-service"
			);
			const reminderService = new BookingReminderService({ db: this.deps.db });
			await reminderService.scheduleBookingReminders(booking.id);
		} catch (error) {
			console.error("Failed to schedule booking reminders:", error);
		}

		// Apply buffer time to prevent back-to-back bookings
		if (service.bufferTime && service.bufferTime > 0) {
			try {
				await this.applyBufferTime(booking, service.bufferTime);
			} catch (error) {
				console.error("Failed to apply buffer time:", error);
			}
		}

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
		if (booking.providerId !== this.deps.currentUserId) {
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

		// Send SMS/Email notification to client
		try {
			await notificationService.sendNotification(
				NotificationTypes.BOOKING_ACCEPTED,
				{
					email: booking.client.email || undefined,
					phone: booking.client.phone || undefined,
					name: booking.client.name || "Cliente",
				},
				{
					serviceName: booking.service.title,
					providerName: this.deps.currentUser?.name || "Profissional",
					date: booking.bookingDate.toLocaleDateString("pt-BR"),
					address: booking.address || "",
				},
				["sms", "email"],
			);
		} catch (error) {
			console.error("Failed to send acceptance notification:", error);
		}

		// Send real-time WebSocket notification to client
		try {
			wsServer.sendBookingUpdate(booking.clientId, {
				type: "booking_accepted",
				bookingId: booking.id,
				serviceName: booking.service.title,
				providerName: this.deps.currentUser?.name || "Profissional",
				date: booking.bookingDate.toISOString(),
				message: `Sua reserva para ${booking.service.title} foi aceita!`,
			});
		} catch (error) {
			console.error("Failed to send WebSocket notification:", error);
		}

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
		if (booking.providerId !== this.deps.currentUserId) {
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
				cancelledBy: this.deps.currentUserId,
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

		// Send SMS/Email notification to client
		try {
			const client = await this.deps.db.user.findUnique({
				where: { id: booking.clientId },
			});

			if (client) {
				await notificationService.sendNotification(
					NotificationTypes.BOOKING_DECLINED,
					{
						email: client.email || undefined,
						phone: client.phone || undefined,
						name: client.name || "Cliente",
					},
					{
						serviceName: booking.service.title,
						reason: input.reason || "",
					},
					["sms", "email"],
				);
			}
		} catch (error) {
			console.error("Failed to send decline notification:", error);
		}

		// Send real-time WebSocket notification to client
		try {
			wsServer.sendBookingUpdate(booking.clientId, {
				type: "booking_declined",
				bookingId: booking.id,
				serviceName: booking.service.title,
				reason: input.reason || "",
				date: booking.bookingDate.toISOString(),
				message: `Sua reserva para ${booking.service.title} foi recusada`,
			});
		} catch (error) {
			console.error("Failed to send WebSocket notification:", error);
		}

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
			booking.clientId !== this.deps.currentUserId &&
			booking.providerId !== this.deps.currentUserId
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
		const isClient = booking.clientId === this.deps.currentUserId;
		const isProvider = booking.providerId === this.deps.currentUserId;

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
					input.status === "cancelled" ? this.deps.currentUserId : undefined,
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

		// Check waitlist opportunities for cancelled bookings
		if (input.status === "cancelled") {
			await this.handleCancellationWaitlist({
				id: booking.id,
				serviceId: booking.serviceId,
				bookingDate: booking.bookingDate,
			});
		}

		return updatedBooking;
	}

	async listBookings(input: ListBookingsInput) {
		const where: { clientId?: string; providerId?: string; status?: string } =
			input.role === "client"
				? { clientId: this.deps.currentUserId }
				: { providerId: this.deps.currentUserId };

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

	/**
	 * Apply buffer time around a booking to prevent conflicts
	 */
	private async applyBufferTime(
		booking: {
			id: string;
			bookingDate: Date;
			endDate?: Date | null;
			serviceId: string;
		},
		bufferMinutes: number,
	) {
		const startTime = new Date(
			booking.bookingDate.getTime() - bufferMinutes * 60000,
		);
		const endTime = new Date(
			(booking.endDate || booking.bookingDate).getTime() +
				bufferMinutes * 60000,
		);

		// Get provider ID first
		const service = await this.deps.db.service.findUnique({
			where: { id: booking.serviceId },
			select: { providerId: true },
		});

		if (!service?.providerId) {
			throw new Error("Service provider not found");
		}

		// Mark buffer time slots as unavailable
		await this.deps.db.timeSlot.createMany({
			data: [
				{
					providerId: service.providerId,
					serviceId: booking.serviceId,
					date: new Date(booking.bookingDate.toDateString()),
					startTime,
					endTime: booking.bookingDate,
					isBooked: true,
				},
				{
					providerId: service.providerId,
					serviceId: booking.serviceId,
					date: new Date(
						(booking.endDate || booking.bookingDate).toDateString(),
					),
					startTime: booking.endDate || booking.bookingDate,
					endTime,
					isBooked: true,
				},
			],
			skipDuplicates: true,
		});
	}

	/**
	 * Handle booking cancellation and check waitlist
	 */
	private async handleCancellationWaitlist(booking: {
		id: string;
		serviceId: string;
		bookingDate: Date;
	}) {
		try {
			const { WaitlistService } = await import("./waitlist-service");
			const waitlistService = new WaitlistService({
				db: this.deps.db,
				currentUserId: this.deps.currentUserId,
			});

			await waitlistService.checkWaitlistOpportunities(
				booking.serviceId,
				booking.bookingDate,
			);
		} catch (error) {
			console.error("Failed to check waitlist opportunities:", error);
		}
	}
}

// Export factory function for easy instantiation
export const createBookingService = (deps: BookingServiceDependencies) =>
	new BookingService(deps);
