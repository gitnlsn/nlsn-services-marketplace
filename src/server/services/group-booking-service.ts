import type { PrismaClient } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { createBookingService } from "./booking-service";
import { createCommunicationService } from "./communication-service";

interface GroupBookingDeps {
	db: PrismaClient;
	currentUserId: string;
}

interface CreateGroupBookingInput {
	serviceId: string;
	name: string;
	description?: string;
	maxParticipants: number;
	minParticipants?: number;
	bookingDate: Date;
	endDate: Date;
}

interface JoinGroupBookingInput {
	groupBookingId: string;
	notes?: string;
}

export class GroupBookingService {
	constructor(private deps: GroupBookingDeps) {}

	/**
	 * Create a new group booking
	 */
	async createGroupBooking(input: CreateGroupBookingInput) {
		// Validate service
		const service = await this.deps.db.service.findUnique({
			where: { id: input.serviceId },
			include: {
				groupBookingSettings: true,
				provider: true,
			},
		});

		if (!service) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Service not found",
			});
		}

		if (!service.groupBookingSettings?.enabled) {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: "This service does not allow group bookings",
			});
		}

		// Validate group size limits
		const settings = service.groupBookingSettings;
		if (input.maxParticipants > settings.maxGroupSize) {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: `Maximum group size is ${settings.maxGroupSize}`,
			});
		}

		const minParticipants = input.minParticipants || settings.minGroupSize;

		// Calculate price per person with group discount
		const basePrice = service.price;
		const discount = settings.groupDiscount || 0;
		const pricePerPerson = basePrice * (1 - discount / 100);

		// Create the group booking
		const groupBooking = await this.deps.db.groupBooking.create({
			data: {
				serviceId: input.serviceId,
				organizerId: this.deps.currentUserId,
				name: input.name,
				description: input.description,
				maxParticipants: input.maxParticipants,
				minParticipants,
				pricePerPerson,
				bookingDate: input.bookingDate,
				endDate: input.endDate,
				status: "open",
			},
			include: {
				service: {
					include: {
						provider: true,
					},
				},
				organizer: true,
			},
		});

		// Create a booking for the organizer
		const bookingService = createBookingService({
			db: this.deps.db,
			currentUserId: this.deps.currentUserId,
		});

		const organizerBooking = await bookingService.createBooking({
			serviceId: input.serviceId,
			bookingDate: input.bookingDate,
			endDate: input.endDate,
			groupBookingId: groupBooking.id,
			notes: `Organizador do grupo: ${input.name}`,
		});

		return {
			groupBooking,
			organizerBooking,
		};
	}

	/**
	 * Join an existing group booking
	 */
	async joinGroupBooking(input: JoinGroupBookingInput) {
		const groupBooking = await this.deps.db.groupBooking.findUnique({
			where: { id: input.groupBookingId },
			include: {
				service: {
					include: {
						provider: true,
						groupBookingSettings: true,
					},
				},
				bookings: true,
				organizer: true,
			},
		});

		if (!groupBooking) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Group booking not found",
			});
		}

		if (groupBooking.status !== "open") {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: "This group booking is no longer accepting participants",
			});
		}

		// Check if user is already in the group
		const existingBooking = groupBooking.bookings.find(
			(b) => b.clientId === this.deps.currentUserId,
		);

		if (existingBooking) {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: "You are already part of this group",
			});
		}

		// Check if group is full
		if (groupBooking.bookings.length >= groupBooking.maxParticipants) {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: "This group is already full",
			});
		}

		// Get current user info for notifications
		const currentUser = await this.deps.db.user.findUnique({
			where: { id: this.deps.currentUserId },
			select: { name: true },
		});

		// Create booking for the new participant
		const bookingService = createBookingService({
			db: this.deps.db,
			currentUserId: this.deps.currentUserId,
		});

		const booking = await bookingService.createBooking({
			serviceId: groupBooking.serviceId,
			bookingDate: groupBooking.bookingDate,
			endDate: groupBooking.endDate,
			groupBookingId: groupBooking.id,
			notes: input.notes,
		});

		// Check if group has reached minimum participants
		const updatedBookingCount = groupBooking.bookings.length + 1;
		if (
			updatedBookingCount === groupBooking.minParticipants &&
			groupBooking.status === "open"
		) {
			// Notify organizer that minimum has been reached
			const groupBookingForNotification = {
				...groupBooking,
				participants: groupBooking.bookings.map((b) => ({
					id: b.id,
					client: { email: null },
				})),
			};
			await this.notifyGroupUpdate(
				groupBookingForNotification,
				"minimum_reached",
				{
					id: booking.booking.id,
					client: { name: currentUser?.name || "Participant" },
				},
			);
		}

		// If group is now full, update status
		if (updatedBookingCount === groupBooking.maxParticipants) {
			await this.deps.db.groupBooking.update({
				where: { id: groupBooking.id },
				data: { status: "confirmed" },
			});

			const groupBookingForNotification = {
				...groupBooking,
				participants: groupBooking.bookings.map((b) => ({
					id: b.id,
					client: { email: null },
				})),
			};
			await this.notifyGroupUpdate(groupBookingForNotification, "group_full", {
				id: booking.booking.id,
				client: { name: currentUser?.name || "Participant" },
			});
		}

		return booking;
	}

	/**
	 * Leave a group booking
	 */
	async leaveGroupBooking(groupBookingId: string) {
		const booking = await this.deps.db.booking.findFirst({
			where: {
				groupBookingId,
				clientId: this.deps.currentUserId,
				status: { in: ["pending", "accepted"] },
			},
			include: {
				groupBooking: {
					include: {
						bookings: true,
						organizer: true,
					},
				},
			},
		});

		if (!booking) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "You are not part of this group booking",
			});
		}

		const groupBooking = booking.groupBooking;
		if (!groupBooking) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Group booking not found",
			});
		}

		// Prevent organizer from leaving their own group
		if (groupBooking.organizerId === this.deps.currentUserId) {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message:
					"As the organizer, you cannot leave the group. Cancel the entire group instead.",
			});
		}

		// Cancel the individual booking
		await this.deps.db.booking.update({
			where: { id: booking.id },
			data: {
				status: "cancelled",
				cancelledBy: this.deps.currentUserId,
				cancelledAt: new Date(),
				cancellationReason: "Left group booking",
			},
		});

		// Check if group drops below minimum
		const remainingBookings = groupBooking.bookings.filter(
			(b) => b.id !== booking.id && b.status !== "cancelled",
		);

		if (remainingBookings.length < groupBooking.minParticipants) {
			const groupBookingForNotification = {
				...groupBooking,
				participants: groupBooking.bookings.map((b) => ({
					id: b.id,
					client: { email: null },
				})),
			};
			await this.notifyGroupUpdate(
				groupBookingForNotification,
				"below_minimum",
				{
					id: booking.id,
					client: { name: booking.clientId },
				},
			);
		}

		return { success: true };
	}

	/**
	 * Get group booking details
	 */
	async getGroupBookingDetails(id: string) {
		const groupBooking = await this.deps.db.groupBooking.findUnique({
			where: { id },
			include: {
				service: {
					include: {
						provider: true,
						images: true,
					},
				},
				organizer: true,
				bookings: {
					where: {
						status: { notIn: ["cancelled", "declined"] },
					},
					include: {
						client: {
							select: {
								id: true,
								name: true,
								image: true,
							},
						},
					},
				},
			},
		});

		if (!groupBooking) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Group booking not found",
			});
		}

		// Check if user is part of the group or is the provider
		const isParticipant = groupBooking.bookings.some(
			(b) => b.clientId === this.deps.currentUserId,
		);
		const isProvider =
			groupBooking.service.providerId === this.deps.currentUserId;

		if (!isParticipant && !isProvider) {
			// Return limited info for non-participants
			return {
				...groupBooking,
				bookings: [], // Hide participant list
			};
		}

		return groupBooking;
	}

	/**
	 * List available group bookings
	 */
	async listAvailableGroupBookings(filters?: {
		categoryId?: string;
		city?: string;
		startDate?: Date;
		endDate?: Date;
	}) {
		const where: {
			status: string;
			bookingDate: { gte: Date; lte?: Date };
			service?: { categoryId: string };
			location?: { contains: string; mode: "insensitive" };
		} = {
			status: "open",
			bookingDate: { gte: new Date() },
		};

		if (filters?.categoryId) {
			where.service = { categoryId: filters.categoryId };
		}

		if (filters?.startDate) {
			where.bookingDate = { gte: filters.startDate };
		}

		if (filters?.endDate) {
			where.bookingDate = {
				...where.bookingDate,
				lte: filters.endDate,
			};
		}

		const groupBookings = await this.deps.db.groupBooking.findMany({
			where,
			include: {
				service: {
					include: {
						provider: true,
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
			orderBy: { bookingDate: "asc" },
		});

		// Add availability info
		return groupBookings.map((gb) => ({
			...gb,
			currentParticipants: gb._count.bookings,
			spotsAvailable: gb.maxParticipants - gb._count.bookings,
			isMinimumReached: gb._count.bookings >= gb.minParticipants,
		}));
	}

	/**
	 * Cancel a group booking (organizer only)
	 */
	async cancelGroupBooking(id: string, reason: string) {
		const groupBooking = await this.deps.db.groupBooking.findUnique({
			where: { id },
			include: {
				bookings: {
					where: {
						status: { in: ["pending", "accepted"] },
					},
				},
			},
		});

		if (!groupBooking) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Group booking not found",
			});
		}

		if (groupBooking.organizerId !== this.deps.currentUserId) {
			throw new TRPCError({
				code: "UNAUTHORIZED",
				message: "Only the organizer can cancel the group booking",
			});
		}

		// Update group booking status
		await this.deps.db.groupBooking.update({
			where: { id },
			data: { status: "cancelled" },
		});

		// Cancel all individual bookings
		await this.deps.db.booking.updateMany({
			where: {
				groupBookingId: id,
				status: { in: ["pending", "accepted"] },
			},
			data: {
				status: "cancelled",
				cancelledBy: this.deps.currentUserId,
				cancelledAt: new Date(),
				cancellationReason: `Group booking cancelled: ${reason}`,
			},
		});

		// Notify all participants
		await this.notifyGroupCancellation(groupBooking, reason);

		return { success: true };
	}

	/**
	 * Notify group members about updates
	 */
	private async notifyGroupUpdate(
		groupBooking: {
			id: string;
			name: string;
			organizer: { email?: string | null; notificationEmail?: boolean };
			participants: Array<{ id: string; client: { email?: string | null } }>;
		},
		type:
			| "minimum_reached"
			| "group_full"
			| "below_minimum"
			| "new_participant",
		triggeringBooking?: {
			id: string;
			client: { name?: string | null };
		},
	) {
		const communicationService = createCommunicationService();

		const messages = {
			minimum_reached: `O grupo "${groupBooking.name}" atingiu o número mínimo de participantes!`,
			group_full: `O grupo "${groupBooking.name}" está completo!`,
			below_minimum: `O grupo "${groupBooking.name}" está abaixo do número mínimo de participantes.`,
			new_participant: `Um novo participante entrou no grupo "${groupBooking.name}"!`,
		};

		const message = messages[type];

		// Notify organizer
		if (
			groupBooking.organizer.notificationEmail &&
			groupBooking.organizer.email
		) {
			await communicationService.sendEmail({
				to: groupBooking.organizer.email,
				subject: `Atualização do grupo: ${groupBooking.name}`,
				html: `<p>${message}</p>`,
			});
		}

		// For certain updates, notify all participants
		if (["minimum_reached", "group_full"].includes(type)) {
			const participants = await this.deps.db.booking.findMany({
				where: {
					groupBookingId: groupBooking.id,
					status: { in: ["pending", "accepted"] },
				},
				include: { client: true },
			});

			for (const booking of participants) {
				if (
					booking.client.notificationEmail &&
					booking.client.email &&
					booking.id !== triggeringBooking?.id
				) {
					await communicationService.sendEmail({
						to: booking.client.email,
						subject: `Atualização do grupo: ${groupBooking.name}`,
						html: `<p>${message}</p>`,
					});
				}
			}
		}
	}

	/**
	 * Notify all participants about group cancellation
	 */
	private async notifyGroupCancellation(
		groupBooking: {
			id: string;
			name: string;
		},
		reason: string,
	) {
		const communicationService = createCommunicationService();

		const participants = await this.deps.db.booking.findMany({
			where: {
				groupBookingId: groupBooking.id,
			},
			include: { client: true },
		});

		for (const booking of participants) {
			if (booking.client.notificationEmail && booking.client.email) {
				await communicationService.sendEmail({
					to: booking.client.email,
					subject: `Grupo cancelado: ${groupBooking.name}`,
					html: `
						<p>O grupo "${groupBooking.name}" foi cancelado.</p>
						<p><strong>Motivo:</strong> ${reason}</p>
						<p>Pedimos desculpas pelo transtorno.</p>
					`,
				});
			}
		}
	}
}
