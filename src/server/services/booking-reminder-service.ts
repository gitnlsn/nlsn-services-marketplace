import type { PrismaClient } from "@prisma/client";
import { addHours, format, isBefore, subHours } from "date-fns";
import { ptBR } from "date-fns/locale";
import { createCommunicationService } from "./communication-service";

interface BookingReminderDeps {
	db: PrismaClient;
}

export class BookingReminderService {
	constructor(private deps: BookingReminderDeps) {}

	/**
	 * Schedule reminders for a booking
	 */
	async scheduleBookingReminders(bookingId: string) {
		const booking = await this.deps.db.booking.findUnique({
			where: { id: bookingId },
			include: {
				client: true,
				provider: true,
				service: true,
			},
		});

		if (!booking) {
			console.error(`Booking ${bookingId} not found`);
			return;
		}

		// Schedule different reminder times
		const reminderTimes = [
			{ hours: 24, type: "email" }, // 24 hours before
			{ hours: 24, type: "sms" }, // 24 hours before
			{ hours: 2, type: "whatsapp" }, // 2 hours before
		];

		const reminders = [];

		for (const { hours, type } of reminderTimes) {
			const scheduledFor = subHours(booking.bookingDate, hours);

			// Don't schedule if it's already past the scheduled time
			if (isBefore(scheduledFor, new Date())) {
				continue;
			}

			// Check if reminder already exists
			const existingReminder = await this.deps.db.bookingReminder.findFirst({
				where: {
					bookingId,
					type,
					scheduledFor,
				},
			});

			if (!existingReminder) {
				const reminder = await this.deps.db.bookingReminder.create({
					data: {
						bookingId,
						type,
						scheduledFor,
						status: "pending",
					},
				});
				reminders.push(reminder);
			}
		}

		return reminders;
	}

	/**
	 * Send pending reminders
	 * This would typically be called by a cron job
	 */
	async sendPendingReminders() {
		const pendingReminders = await this.deps.db.bookingReminder.findMany({
			where: {
				status: "pending",
				scheduledFor: { lte: new Date() },
			},
			include: {
				booking: {
					include: {
						client: true,
						provider: true,
						service: true,
					},
				},
			},
		});

		const results = [];

		for (const reminder of pendingReminders) {
			try {
				await this.sendReminder(reminder);
				results.push({ id: reminder.id, status: "sent" });
			} catch (error) {
				console.error(`Error sending reminder ${reminder.id}:`, error);
				results.push({ id: reminder.id, status: "failed", error });
			}
		}

		return results;
	}

	/**
	 * Send a single reminder
	 */
	private async sendReminder(reminder: {
		id: string;
		type: string;
		booking: {
			id: string;
			bookingDate: Date;
			address?: string | null;
			notes?: string | null;
			service: {
				title: string;
				location?: string | null;
			};
			client: {
				name?: string | null;
				email?: string | null;
				phone?: string | null;
				notificationEmail: boolean;
				notificationSms: boolean;
				notificationWhatsapp: boolean;
			};
			provider: {
				name?: string | null;
			};
		};
	}) {
		const { booking } = reminder;

		if (!booking.client) {
			throw new Error("Client not found for booking");
		}

		const communicationService = createCommunicationService();

		const formattedDate = format(
			booking.bookingDate,
			"dd 'de' MMMM 'às' HH:mm",
			{ locale: ptBR },
		);

		const message = `Olá ${booking.client.name || "Cliente"}! Este é um lembrete sobre seu agendamento de ${booking.service.title} em ${formattedDate}. Endereço: ${booking.address || booking.service.location || "A confirmar"}`;

		let sentSuccessfully = false;

		try {
			switch (reminder.type) {
				case "email":
					if (booking.client.email && booking.client.notificationEmail) {
						await communicationService.sendEmail({
							to: booking.client.email,
							subject: `Lembrete: ${booking.service.title} - ${formattedDate}`,
							html: `
								<h2>Lembrete de Agendamento</h2>
								<p>${message}</p>
								<p><strong>Serviço:</strong> ${booking.service.title}</p>
								<p><strong>Data/Hora:</strong> ${formattedDate}</p>
								<p><strong>Profissional:</strong> ${booking.provider.name || "A confirmar"}</p>
								<p><strong>Endereço:</strong> ${booking.address || booking.service.location || "A confirmar"}</p>
								${booking.notes ? `<p><strong>Observações:</strong> ${booking.notes}</p>` : ""}
							`,
						});
						sentSuccessfully = true;
					}
					break;

				case "sms":
					if (booking.client.phone && booking.client.notificationSms) {
						await communicationService.sendSMS({
							to: booking.client.phone,
							body: message,
						});
						sentSuccessfully = true;
					}
					break;

				case "whatsapp":
					if (booking.client.phone && booking.client.notificationWhatsapp) {
						await communicationService.sendWhatsApp({
							to: booking.client.phone,
							body: message,
						});
						sentSuccessfully = true;
					}
					break;
			}

			if (sentSuccessfully) {
				await this.deps.db.bookingReminder.update({
					where: { id: reminder.id },
					data: {
						status: "sent",
						sentAt: new Date(),
					},
				});
			} else {
				throw new Error(
					"User has disabled this notification type or contact info missing",
				);
			}
		} catch (error) {
			// Update reminder with error
			await this.deps.db.bookingReminder.update({
				where: { id: reminder.id },
				data: {
					status: "failed",
					retryCount: { increment: 1 },
					lastError: String(error),
				},
			});

			throw error;
		}
	}

	/**
	 * Retry failed reminders
	 */
	async retryFailedReminders() {
		const failedReminders = await this.deps.db.bookingReminder.findMany({
			where: {
				status: "failed",
				retryCount: { lt: 3 },
				booking: {
					bookingDate: { gt: new Date() }, // Only for future bookings
				},
			},
			include: {
				booking: {
					include: {
						client: true,
						provider: true,
						service: true,
					},
				},
			},
		});

		const results = [];

		for (const reminder of failedReminders) {
			try {
				await this.sendReminder(reminder);
				results.push({ id: reminder.id, status: "sent" });
			} catch (error) {
				console.error(`Retry failed for reminder ${reminder.id}:`, error);
				results.push({ id: reminder.id, status: "failed", error });
			}
		}

		return results;
	}

	/**
	 * Cancel reminders for a booking
	 */
	async cancelBookingReminders(bookingId: string) {
		await this.deps.db.bookingReminder.updateMany({
			where: {
				bookingId,
				status: "pending",
			},
			data: {
				status: "cancelled",
			},
		});
	}

	/**
	 * Get reminder preferences for a user
	 */
	async getReminderPreferences(userId: string) {
		const user = await this.deps.db.user.findUnique({
			where: { id: userId },
			select: {
				notificationEmail: true,
				notificationSms: true,
				notificationWhatsapp: true,
			},
		});

		return user;
	}

	/**
	 * Update reminder preferences
	 */
	async updateReminderPreferences(
		userId: string,
		preferences: {
			notificationEmail?: boolean;
			notificationSms?: boolean;
			notificationWhatsapp?: boolean;
		},
	) {
		return await this.deps.db.user.update({
			where: { id: userId },
			data: preferences,
		});
	}

	/**
	 * Process pending reminders (alias for sendPendingReminders for backward compatibility)
	 */
	async processPendingReminders() {
		return await this.sendPendingReminders();
	}

	/**
	 * Get reminder statistics
	 */
	async getReminderStats() {
		const [sent, pending, failed, cancelled] = await Promise.all([
			this.deps.db.bookingReminder.count({ where: { status: "sent" } }),
			this.deps.db.bookingReminder.count({ where: { status: "pending" } }),
			this.deps.db.bookingReminder.count({ where: { status: "failed" } }),
			this.deps.db.bookingReminder.count({ where: { status: "cancelled" } }),
		]);

		const total = sent + pending + failed + cancelled;

		return {
			total,
			sent,
			pending,
			failed,
			cancelled,
			successRate: total > 0 ? (sent / total) * 100 : 0,
		};
	}
}
