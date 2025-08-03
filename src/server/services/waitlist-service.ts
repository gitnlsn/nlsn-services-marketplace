import type { PrismaClient } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { addDays, addHours, isBefore, startOfDay } from "date-fns";
import { createCommunicationService } from "./communication-service";

interface WaitlistServiceDeps {
	db: PrismaClient;
	currentUserId: string;
}

interface JoinWaitlistInput {
	serviceId: string;
	preferredDate: Date;
	preferredTime?: string;
	alternativeDates?: Date[];
	duration?: number;
	notes?: string;
}

interface NotifyWaitlistInput {
	waitlistId: string;
	availableDate: Date;
	availableTime: string;
	expiresInHours?: number;
}

export class WaitlistService {
	constructor(private deps: WaitlistServiceDeps) {}

	/**
	 * Join a waitlist for a service
	 */
	async joinWaitlist(input: JoinWaitlistInput) {
		// Verify service exists
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
				message: "Service is not available",
			});
		}

		// Check if user already on waitlist
		const existingEntry = await this.deps.db.waitlist.findUnique({
			where: {
				serviceId_clientId: {
					serviceId: input.serviceId,
					clientId: this.deps.currentUserId,
				},
			},
		});

		if (existingEntry && existingEntry.status === "active") {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: "You are already on the waitlist for this service",
			});
		}

		// Create or update waitlist entry
		const waitlistEntry = await this.deps.db.waitlist.upsert({
			where: {
				serviceId_clientId: {
					serviceId: input.serviceId,
					clientId: this.deps.currentUserId,
				},
			},
			create: {
				serviceId: input.serviceId,
				clientId: this.deps.currentUserId,
				preferredDate: startOfDay(input.preferredDate),
				preferredTime: input.preferredTime,
				alternativeDates:
					input.alternativeDates?.map((d) => startOfDay(d)) || [],
				duration: input.duration,
				notes: input.notes,
				status: "active",
			},
			update: {
				preferredDate: startOfDay(input.preferredDate),
				preferredTime: input.preferredTime,
				alternativeDates:
					input.alternativeDates?.map((d) => startOfDay(d)) || [],
				duration: input.duration,
				notes: input.notes,
				status: "active",
				notifiedAt: null,
				expiresAt: null,
			},
		});

		// Notify provider about new waitlist entry
		await this.deps.db.notification.create({
			data: {
				userId: service.providerId,
				type: "waitlist_joined",
				title: "Nova entrada na lista de espera",
				message: `Um cliente entrou na lista de espera para ${service.title}`,
			},
		});

		return waitlistEntry;
	}

	/**
	 * Leave a waitlist
	 */
	async leaveWaitlist(serviceId: string) {
		const waitlistEntry = await this.deps.db.waitlist.findUnique({
			where: {
				serviceId_clientId: {
					serviceId,
					clientId: this.deps.currentUserId,
				},
			},
		});

		if (!waitlistEntry) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "You are not on the waitlist for this service",
			});
		}

		await this.deps.db.waitlist.update({
			where: { id: waitlistEntry.id },
			data: { status: "cancelled" },
		});

		return { success: true };
	}

	/**
	 * Get waitlist entries for a service (provider only)
	 */
	async getServiceWaitlist(serviceId: string) {
		// Verify service ownership
		const service = await this.deps.db.service.findUnique({
			where: { id: serviceId },
		});

		if (!service) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Service not found",
			});
		}

		if (service.providerId !== this.deps.currentUserId) {
			throw new TRPCError({
				code: "UNAUTHORIZED",
				message: "You can only view waitlists for your own services",
			});
		}

		return await this.deps.db.waitlist.findMany({
			where: {
				serviceId,
				status: "active",
			},
			include: {
				client: {
					select: {
						id: true,
						name: true,
						email: true,
						phone: true,
					},
				},
			},
			orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
		});
	}

	/**
	 * Get user's waitlist entries
	 */
	async getUserWaitlists(userId?: string) {
		const targetUserId = userId || this.deps.currentUserId;

		return await this.deps.db.waitlist.findMany({
			where: {
				clientId: targetUserId,
				status: { in: ["active", "notified"] },
			},
			include: {
				service: {
					include: {
						provider: {
							select: {
								id: true,
								name: true,
							},
						},
						images: { take: 1 },
					},
				},
			},
			orderBy: { createdAt: "desc" },
		});
	}

	/**
	 * Notify waitlist about availability
	 */
	async notifyWaitlistAvailability(input: NotifyWaitlistInput) {
		const waitlistEntry = await this.deps.db.waitlist.findUnique({
			where: { id: input.waitlistId },
			include: {
				client: true,
				service: {
					include: { provider: true },
				},
			},
		});

		if (!waitlistEntry) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Waitlist entry not found",
			});
		}

		// Verify service ownership
		if (waitlistEntry.service.providerId !== this.deps.currentUserId) {
			throw new TRPCError({
				code: "UNAUTHORIZED",
				message: "You can only notify waitlists for your own services",
			});
		}

		if (waitlistEntry.status !== "active") {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: "Waitlist entry is not active",
			});
		}

		const expiresAt = addHours(new Date(), input.expiresInHours || 24);

		// Update waitlist entry
		await this.deps.db.waitlist.update({
			where: { id: input.waitlistId },
			data: {
				status: "notified",
				notifiedAt: new Date(),
				expiresAt,
			},
		});

		// Send notification to client
		const communicationService = createCommunicationService();

		const message = `Boa notícia! Temos uma vaga disponível para ${waitlistEntry.service.title} em ${input.availableDate.toLocaleDateString("pt-BR")} às ${input.availableTime}. Você tem até ${expiresAt.toLocaleString("pt-BR")} para confirmar a reserva.`;

		try {
			if (waitlistEntry.client.email) {
				await communicationService.sendEmail({
					to: waitlistEntry.client.email,
					subject: `Vaga disponível: ${waitlistEntry.service.title}`,
					html: `
						<h2>Vaga Disponível!</h2>
						<p>${message}</p>
						<p><strong>Serviço:</strong> ${waitlistEntry.service.title}</p>
						<p><strong>Data/Hora:</strong> ${input.availableDate.toLocaleDateString("pt-BR")} às ${input.availableTime}</p>
						<p><strong>Válido até:</strong> ${expiresAt.toLocaleString("pt-BR")}</p>
						<p>Entre no aplicativo para confirmar sua reserva.</p>
					`,
				});
			}

			if (waitlistEntry.client.phone) {
				await communicationService.sendSMS({
					to: waitlistEntry.client.phone,
					body: message.substring(0, 160), // SMS character limit
				});
			}
		} catch (error) {
			console.error("Failed to send waitlist notification:", error);
		}

		// Create in-app notification
		await this.deps.db.notification.create({
			data: {
				userId: waitlistEntry.clientId,
				type: "waitlist_available",
				title: "Vaga disponível!",
				message,
			},
		});

		return { success: true };
	}

	/**
	 * Check for waitlist opportunities when booking is cancelled
	 */
	async checkWaitlistOpportunities(serviceId: string, cancelledDate: Date) {
		// Find waitlist entries that match the cancelled date
		const waitlistEntries = await this.deps.db.waitlist.findMany({
			where: {
				serviceId,
				status: "active",
				OR: [
					{ preferredDate: startOfDay(cancelledDate) },
					{ alternativeDates: { has: startOfDay(cancelledDate) } },
				],
			},
			include: {
				client: true,
				service: true,
			},
			orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
			take: 5, // Limit to top 5 candidates
		});

		const notifications = [];

		for (const entry of waitlistEntries) {
			try {
				await this.notifyWaitlistAvailability({
					waitlistId: entry.id,
					availableDate: cancelledDate,
					availableTime: entry.preferredTime || "09:00",
					expiresInHours: 24,
				});
				notifications.push(entry.id);
			} catch (error) {
				console.error(`Failed to notify waitlist ${entry.id}:`, error);
			}
		}

		return { notified: notifications.length, waitlistIds: notifications };
	}

	/**
	 * Process expired waitlist notifications
	 */
	async processExpiredNotifications() {
		const expiredEntries = await this.deps.db.waitlist.findMany({
			where: {
				status: "notified",
				expiresAt: { lte: new Date() },
			},
		});

		await this.deps.db.waitlist.updateMany({
			where: {
				id: { in: expiredEntries.map((e) => e.id) },
			},
			data: {
				status: "active",
				notifiedAt: null,
				expiresAt: null,
			},
		});

		return { processed: expiredEntries.length };
	}

	/**
	 * Update waitlist priority
	 */
	async updateWaitlistPriority(waitlistId: string, priority: number) {
		const waitlistEntry = await this.deps.db.waitlist.findUnique({
			where: { id: waitlistId },
			include: { service: true },
		});

		if (!waitlistEntry) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Waitlist entry not found",
			});
		}

		// Verify service ownership
		if (waitlistEntry.service.providerId !== this.deps.currentUserId) {
			throw new TRPCError({
				code: "UNAUTHORIZED",
				message: "You can only update priorities for your own services",
			});
		}

		return await this.deps.db.waitlist.update({
			where: { id: waitlistId },
			data: { priority },
		});
	}

	/**
	 * Convert waitlist entry to booking
	 */
	async convertToBooking(waitlistId: string, bookingDate: Date) {
		const waitlistEntry = await this.deps.db.waitlist.findUnique({
			where: { id: waitlistId },
			include: {
				service: true,
				client: true,
			},
		});

		if (!waitlistEntry) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Waitlist entry not found",
			});
		}

		if (waitlistEntry.status !== "notified") {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: "Waitlist entry must be in notified status",
			});
		}

		// Check if notification has expired
		if (
			waitlistEntry.expiresAt &&
			isBefore(waitlistEntry.expiresAt, new Date())
		) {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: "Waitlist notification has expired",
			});
		}

		// Create the booking
		const booking = await this.deps.db.booking.create({
			data: {
				serviceId: waitlistEntry.serviceId,
				clientId: waitlistEntry.clientId,
				providerId: waitlistEntry.service.providerId,
				bookingDate,
				totalPrice: waitlistEntry.service.price,
				notes: waitlistEntry.notes,
				status: "pending",
			},
		});

		// Update waitlist status
		await this.deps.db.waitlist.update({
			where: { id: waitlistId },
			data: { status: "booked" },
		});

		return booking;
	}

	/**
	 * Get waitlist statistics for a provider
	 */
	async getWaitlistStats(providerId?: string) {
		const targetProviderId = providerId || this.deps.currentUserId;

		const stats = await this.deps.db.waitlist.groupBy({
			by: ["serviceId", "status"],
			where: {
				service: {
					providerId: targetProviderId,
				},
			},
			_count: true,
		});

		const serviceStats = await this.deps.db.service.findMany({
			where: { providerId: targetProviderId },
			select: {
				id: true,
				title: true,
				_count: {
					select: {
						waitlists: {
							where: { status: "active" },
						},
					},
				},
			},
		});

		return {
			byStatus: stats.reduce(
				(acc, stat) => {
					acc[stat.status] = (acc[stat.status] || 0) + stat._count;
					return acc;
				},
				{} as Record<string, number>,
			),
			byService: serviceStats.map((service) => ({
				serviceId: service.id,
				serviceName: service.title,
				activeWaitlists: service._count.waitlists,
			})),
		};
	}
}
