import type { PrismaClient } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { addMinutes, format, parseISO } from "date-fns";
import { google } from "googleapis";
import { env } from "~/env";

interface GoogleCalendarEvent {
	id?: string;
	summary: string;
	description?: string;
	start: {
		dateTime: string;
		timeZone: string;
	};
	end: {
		dateTime: string;
		timeZone: string;
	};
	attendees?: Array<{
		email: string;
		displayName?: string;
	}>;
	reminders?: {
		useDefault: boolean;
		overrides?: Array<{
			method: "email" | "popup";
			minutes: number;
		}>;
	};
}

interface CalendarServiceDeps {
	db: PrismaClient;
	userId: string;
}

export class GoogleCalendarService {
	private oauth2Client;
	private calendar;

	constructor(private deps: CalendarServiceDeps) {
		this.oauth2Client = new google.auth.OAuth2(
			env.AUTH_GOOGLE_ID,
			env.AUTH_GOOGLE_SECRET,
			`${process.env.NEXTAUTH_URL}/api/auth/callback/google`,
		);

		this.calendar = google.calendar({ version: "v3", auth: this.oauth2Client });
	}

	/**
	 * Get user's access token from database
	 */
	private async getAccessToken(): Promise<string> {
		const account = await this.deps.db.account.findFirst({
			where: {
				userId: this.deps.userId,
				provider: "google",
			},
		});

		if (!account || !account.access_token) {
			throw new TRPCError({
				code: "UNAUTHORIZED",
				message:
					"Google Calendar not connected. Please reconnect your Google account.",
			});
		}

		// Set the credentials
		this.oauth2Client.setCredentials({
			access_token: account.access_token,
			refresh_token: account.refresh_token,
			expiry_date: account.expires_at ? account.expires_at * 1000 : undefined,
		});

		// Check if token is expired and refresh if needed
		if (account.expires_at && account.expires_at * 1000 < Date.now()) {
			try {
				const { credentials } = await this.oauth2Client.refreshAccessToken();

				// Update tokens in database
				await this.deps.db.account.update({
					where: {
						provider_providerAccountId: {
							provider: "google",
							providerAccountId: account.providerAccountId,
						},
					},
					data: {
						access_token: credentials.access_token,
						expires_at: credentials.expiry_date
							? Math.floor(credentials.expiry_date / 1000)
							: null,
					},
				});

				if (!credentials.access_token) {
					throw new TRPCError({
						code: "UNAUTHORIZED",
						message: "Failed to get access token",
					});
				}
				return credentials.access_token;
			} catch (error) {
				throw new TRPCError({
					code: "UNAUTHORIZED",
					message:
						"Failed to refresh Google Calendar access. Please reconnect your Google account.",
				});
			}
		}

		return account.access_token;
	}

	/**
	 * List calendars
	 */
	async listCalendars() {
		await this.getAccessToken();

		try {
			const response = await this.calendar.calendarList.list();
			return response.data.items || [];
		} catch (error) {
			console.error("Error listing calendars:", error);
			throw new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message: "Failed to list calendars",
			});
		}
	}

	/**
	 * Get events from Google Calendar
	 */
	async getEvents(calendarId: string, startDate: Date, endDate: Date) {
		await this.getAccessToken();

		try {
			const response = await this.calendar.events.list({
				calendarId,
				timeMin: startDate.toISOString(),
				timeMax: endDate.toISOString(),
				singleEvents: true,
				orderBy: "startTime",
			});

			return response.data.items || [];
		} catch (error) {
			console.error("Error fetching events:", error);
			throw new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message: "Failed to fetch calendar events",
			});
		}
	}

	/**
	 * Get free/busy information
	 */
	async getFreeBusy(startDate: Date, endDate: Date, calendarId = "primary") {
		await this.getAccessToken();

		try {
			const response = await this.calendar.freebusy.query({
				requestBody: {
					timeMin: startDate.toISOString(),
					timeMax: endDate.toISOString(),
					items: [{ id: calendarId }],
				},
			});

			return response.data.calendars?.[calendarId]?.busy || [];
		} catch (error) {
			console.error("Error fetching free/busy:", error);
			throw new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message: "Failed to fetch free/busy information",
			});
		}
	}

	/**
	 * Create a calendar event for a booking
	 */
	async createBookingEvent(
		booking: {
			id: string;
			bookingDate: Date;
			endDate?: Date | null;
			service: {
				title: string;
				description?: string | null;
				duration?: number | null;
			};
			client: {
				name?: string | null;
				email?: string | null;
				phone?: string | null;
			};
			address?: string | null;
			notes?: string | null;
		},
		calendarId = "primary",
	) {
		await this.getAccessToken();

		const startTime = booking.bookingDate;
		const endTime =
			booking.endDate || addMinutes(startTime, booking.service.duration || 60);

		const event: GoogleCalendarEvent = {
			summary: `${booking.service.title} - ${booking.client.name || "Cliente"}`,
			description: [
				booking.service.description,
				"",
				"**Detalhes do Cliente:**",
				`Nome: ${booking.client.name || "N/A"}`,
				`Email: ${booking.client.email || "N/A"}`,
				`Telefone: ${booking.client.phone || "N/A"}`,
				"",
				booking.address ? `**Endereço:** ${booking.address}` : "",
				booking.notes ? `**Observações:** ${booking.notes}` : "",
				"",
				`**ID da Reserva:** ${booking.id}`,
			]
				.filter(Boolean)
				.join("\n"),
			start: {
				dateTime: startTime.toISOString(),
				timeZone: "America/Sao_Paulo",
			},
			end: {
				dateTime: endTime.toISOString(),
				timeZone: "America/Sao_Paulo",
			},
			reminders: {
				useDefault: false,
				overrides: [
					{ method: "popup", minutes: 30 },
					{ method: "email", minutes: 60 },
				],
			},
		};

		// Add client as attendee if email is available
		if (booking.client.email) {
			event.attendees = [
				{
					email: booking.client.email,
					displayName: booking.client.name || undefined,
				},
			];
		}

		try {
			const response = await this.calendar.events.insert({
				calendarId,
				requestBody: event,
			});

			// Store the Google Calendar event ID in the booking
			if (response.data.id) {
				await this.deps.db.booking.update({
					where: { id: booking.id },
					data: {
						googleCalendarEventId: response.data.id,
					},
				});
			}

			return response.data;
		} catch (error) {
			console.error("Error creating calendar event:", error);
			throw new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message: "Failed to create calendar event",
			});
		}
	}

	/**
	 * Update a calendar event
	 */
	async updateBookingEvent(
		eventId: string,
		updates: Partial<GoogleCalendarEvent>,
		calendarId = "primary",
	) {
		await this.getAccessToken();

		try {
			const response = await this.calendar.events.patch({
				calendarId,
				eventId,
				requestBody: updates,
			});

			return response.data;
		} catch (error) {
			console.error("Error updating calendar event:", error);
			throw new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message: "Failed to update calendar event",
			});
		}
	}

	/**
	 * Delete a calendar event
	 */
	async deleteBookingEvent(eventId: string, calendarId = "primary") {
		await this.getAccessToken();

		try {
			await this.calendar.events.delete({
				calendarId,
				eventId,
			});

			return { success: true };
		} catch (error) {
			console.error("Error deleting calendar event:", error);
			throw new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message: "Failed to delete calendar event",
			});
		}
	}

	/**
	 * Sync availability from Google Calendar
	 */
	async syncAvailabilityFromCalendar(
		calendarId: string,
		startDate: Date,
		endDate: Date,
	) {
		const busySlots = await this.getFreeBusy(startDate, endDate, calendarId);

		// Convert busy slots to available time slots
		const availableSlots = [];
		let currentTime = new Date(startDate);

		for (const busy of busySlots) {
			if (!busy.start || !busy.end) {
				continue;
			}
			const busyStart = new Date(busy.start);
			const busyEnd = new Date(busy.end);

			// If there's a gap before this busy slot, it's available
			if (currentTime < busyStart) {
				availableSlots.push({
					start: currentTime,
					end: busyStart,
				});
			}

			currentTime = busyEnd;
		}

		// Check if there's time available after the last busy slot
		if (currentTime < endDate) {
			availableSlots.push({
				start: currentTime,
				end: endDate,
			});
		}

		return availableSlots;
	}

	/**
	 * Check if Google Calendar is connected
	 */
	async isConnected(): Promise<boolean> {
		try {
			await this.getAccessToken();
			// Try to list calendars to verify the connection works
			await this.calendar.calendarList.list({ maxResults: 1 });
			return true;
		} catch {
			return false;
		}
	}
}

export function createGoogleCalendarService(deps: CalendarServiceDeps) {
	return new GoogleCalendarService(deps);
}
