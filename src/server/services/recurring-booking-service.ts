import type { PrismaClient } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import {
	addDays,
	addMonths,
	addWeeks,
	endOfDay,
	format,
	isBefore,
	isWithinInterval,
	setDate,
	startOfDay,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { createBookingService } from "./booking-service";

interface RecurringBookingDeps {
	db: PrismaClient;
	currentUserId: string;
}

interface CreateRecurringBookingInput {
	serviceId: string;
	frequency: "daily" | "weekly" | "biweekly" | "monthly";
	interval: number;
	startDate: Date;
	endDate?: Date;
	occurrences?: number;
	daysOfWeek?: number[]; // For weekly: [0,2,4] = Sunday, Tuesday, Thursday
	dayOfMonth?: number; // For monthly: 15 = 15th of each month
	timeSlot: string; // HH:MM format
	duration: number; // Duration in minutes
	notes?: string;
	address?: string;
}

export class RecurringBookingService {
	constructor(private deps: RecurringBookingDeps) {}

	/**
	 * Create a recurring booking series
	 */
	async createRecurringBooking(input: CreateRecurringBookingInput) {
		// Validate service exists and user can book it
		const service = await this.deps.db.service.findUnique({
			where: { id: input.serviceId },
			include: {
				provider: true,
			},
		});

		if (!service) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Service not found",
			});
		}

		if (!service.allowRecurring) {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: "This service does not allow recurring bookings",
			});
		}

		// Calculate all booking dates
		const bookingDates = this.calculateBookingDates(input);

		if (bookingDates.length === 0) {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: "No valid booking dates found for the specified period",
			});
		}

		// Create the recurring booking record
		const recurringBooking = await this.deps.db.recurringBooking.create({
			data: {
				serviceId: input.serviceId,
				clientId: this.deps.currentUserId,
				providerId: service.providerId,
				frequency: input.frequency,
				interval: input.interval,
				startDate: input.startDate,
				endDate: input.endDate,
				occurrences: input.occurrences,
				daysOfWeek: input.daysOfWeek || [],
				dayOfMonth: input.dayOfMonth,
				timeSlot: input.timeSlot,
				duration: input.duration,
				totalPrice: service.price,
				status: "active",
			},
		});

		// Create individual bookings for the first batch (e.g., first month)
		const bookingService = createBookingService({
			db: this.deps.db,
			currentUserId: this.deps.currentUserId,
		});

		const firstBatchDates = bookingDates.slice(0, 4); // Create first 4 occurrences
		const bookings = [];

		for (const date of firstBatchDates) {
			try {
				const booking = await bookingService.createBooking({
					serviceId: input.serviceId,
					bookingDate: date,
					notes: input.notes,
					address: input.address,
					isRecurring: true,
					recurringBookingId: recurringBooking.id,
				});
				bookings.push(booking);
			} catch (error) {
				console.error("Error creating recurring booking instance:", error);
			}
		}

		return {
			recurringBooking,
			bookings,
			totalOccurrences: bookingDates.length,
		};
	}

	/**
	 * Calculate all booking dates based on recurrence pattern
	 */
	private calculateBookingDates(input: CreateRecurringBookingInput): Date[] {
		const dates: Date[] = [];
		let currentDate = new Date(input.startDate);
		const endDate = input.endDate || addMonths(input.startDate, 12); // Default to 1 year
		const maxOccurrences = input.occurrences || 52; // Default max occurrences
		let occurrenceCount = 0;

		// Parse time slot
		const [hours, minutes] = input.timeSlot.split(":").map(Number);
		if (hours === undefined || minutes === undefined) {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: "Invalid time slot format",
			});
		}

		while (isBefore(currentDate, endDate) && occurrenceCount < maxOccurrences) {
			let addDate = false;

			switch (input.frequency) {
				case "daily":
					addDate = true;
					break;
				case "weekly":
				case "biweekly":
					if (input.daysOfWeek?.includes(currentDate.getDay())) {
						addDate = true;
					}
					break;
				case "monthly":
					if (input.dayOfMonth && currentDate.getDate() === input.dayOfMonth) {
						addDate = true;
					}
					break;
			}

			if (addDate) {
				const bookingDate = new Date(currentDate);
				bookingDate.setHours(hours, minutes, 0, 0);
				dates.push(bookingDate);
				occurrenceCount++;
			}

			// Move to next date
			switch (input.frequency) {
				case "daily":
					currentDate = addDays(currentDate, input.interval);
					break;
				case "weekly":
					currentDate = addDays(currentDate, 1);
					if (currentDate.getDay() === 0) {
						// Sunday, start of new week
						currentDate = addDays(currentDate, (input.interval - 1) * 7);
					}
					break;
				case "biweekly":
					currentDate = addDays(currentDate, 1);
					if (currentDate.getDay() === 0) {
						// Sunday, start of new week
						currentDate = addDays(currentDate, 7); // Skip a week
					}
					break;
				case "monthly":
					currentDate = addMonths(currentDate, input.interval);
					if (input.dayOfMonth) {
						currentDate = setDate(currentDate, input.dayOfMonth);
					}
					break;
			}
		}

		return dates;
	}

	/**
	 * Get recurring bookings for a user
	 */
	async getUserRecurringBookings(userId: string) {
		return await this.deps.db.recurringBooking.findMany({
			where: {
				OR: [{ clientId: userId }, { providerId: userId }],
			},
			include: {
				service: true,
				client: true,
				provider: true,
				bookings: {
					take: 5,
					orderBy: { bookingDate: "asc" },
				},
			},
			orderBy: { createdAt: "desc" },
		});
	}

	/**
	 * Get details of a recurring booking
	 */
	async getRecurringBookingDetails(id: string) {
		const recurringBooking = await this.deps.db.recurringBooking.findUnique({
			where: { id },
			include: {
				service: true,
				client: true,
				provider: true,
				bookings: {
					orderBy: { bookingDate: "asc" },
					include: {
						payment: true,
					},
				},
			},
		});

		if (!recurringBooking) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Recurring booking not found",
			});
		}

		// Check user has access
		if (
			recurringBooking.clientId !== this.deps.currentUserId &&
			recurringBooking.providerId !== this.deps.currentUserId
		) {
			throw new TRPCError({
				code: "UNAUTHORIZED",
				message: "You don't have access to this recurring booking",
			});
		}

		// Calculate upcoming dates
		const upcomingDates = this.calculateBookingDates({
			serviceId: recurringBooking.serviceId,
			frequency: recurringBooking.frequency as
				| "daily"
				| "weekly"
				| "biweekly"
				| "monthly",
			interval: recurringBooking.interval,
			startDate: new Date(),
			endDate: recurringBooking.endDate || undefined,
			occurrences: 10, // Next 10 occurrences
			daysOfWeek: recurringBooking.daysOfWeek,
			dayOfMonth: recurringBooking.dayOfMonth || undefined,
			timeSlot: recurringBooking.timeSlot,
			duration: recurringBooking.duration,
		});

		return {
			...recurringBooking,
			upcomingDates,
		};
	}

	/**
	 * Pause a recurring booking
	 */
	async pauseRecurringBooking(id: string) {
		const recurringBooking = await this.deps.db.recurringBooking.findUnique({
			where: { id },
		});

		if (!recurringBooking) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Recurring booking not found",
			});
		}

		// Check user owns this booking
		if (recurringBooking.clientId !== this.deps.currentUserId) {
			throw new TRPCError({
				code: "UNAUTHORIZED",
				message: "You can only pause your own recurring bookings",
			});
		}

		// Update status
		await this.deps.db.recurringBooking.update({
			where: { id },
			data: { status: "paused" },
		});

		// Cancel future bookings
		await this.deps.db.booking.updateMany({
			where: {
				recurringBookingId: id,
				bookingDate: { gt: new Date() },
				status: { in: ["pending", "accepted"] },
			},
			data: {
				status: "cancelled",
				cancellationReason: "Recurring booking paused",
				cancelledBy: this.deps.currentUserId,
				cancelledAt: new Date(),
			},
		});

		return { success: true };
	}

	/**
	 * Resume a paused recurring booking
	 */
	async resumeRecurringBooking(id: string, fromDate: Date) {
		const recurringBooking = await this.deps.db.recurringBooking.findUnique({
			where: { id },
			include: { service: true },
		});

		if (!recurringBooking) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Recurring booking not found",
			});
		}

		// Check user owns this booking
		if (recurringBooking.clientId !== this.deps.currentUserId) {
			throw new TRPCError({
				code: "UNAUTHORIZED",
				message: "You can only resume your own recurring bookings",
			});
		}

		if (recurringBooking.status !== "paused") {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: "Can only resume paused recurring bookings",
			});
		}

		// Update status
		await this.deps.db.recurringBooking.update({
			where: { id },
			data: { status: "active" },
		});

		// Create new bookings from the resume date
		const bookingDates = this.calculateBookingDates({
			serviceId: recurringBooking.serviceId,
			frequency: recurringBooking.frequency as
				| "daily"
				| "weekly"
				| "biweekly"
				| "monthly",
			interval: recurringBooking.interval,
			startDate: fromDate,
			endDate: recurringBooking.endDate || undefined,
			occurrences: 4, // Create next 4 occurrences
			daysOfWeek: recurringBooking.daysOfWeek,
			dayOfMonth: recurringBooking.dayOfMonth || undefined,
			timeSlot: recurringBooking.timeSlot,
			duration: recurringBooking.duration,
		});

		const bookingService = createBookingService({
			db: this.deps.db,
			currentUserId: this.deps.currentUserId,
		});

		for (const date of bookingDates) {
			try {
				await bookingService.createBooking({
					serviceId: recurringBooking.serviceId,
					bookingDate: date,
					isRecurring: true,
					recurringBookingId: id,
				});
			} catch (error) {
				console.error("Error creating recurring booking instance:", error);
			}
		}

		return { success: true };
	}

	/**
	 * Cancel a recurring booking
	 */
	async cancelRecurringBooking(id: string, cancelFutureOnly = true) {
		const recurringBooking = await this.deps.db.recurringBooking.findUnique({
			where: { id },
		});

		if (!recurringBooking) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Recurring booking not found",
			});
		}

		// Check user owns this booking
		if (recurringBooking.clientId !== this.deps.currentUserId) {
			throw new TRPCError({
				code: "UNAUTHORIZED",
				message: "You can only cancel your own recurring bookings",
			});
		}

		// Update recurring booking status
		await this.deps.db.recurringBooking.update({
			where: { id },
			data: { status: "cancelled" },
		});

		// Cancel individual bookings
		const whereClause = {
			recurringBookingId: id,
			status: { in: ["pending", "accepted"] },
			...(cancelFutureOnly && { bookingDate: { gt: new Date() } }),
		};

		await this.deps.db.booking.updateMany({
			where: whereClause,
			data: {
				status: "cancelled",
				cancellationReason: "Recurring booking cancelled",
				cancelledBy: this.deps.currentUserId,
				cancelledAt: new Date(),
			},
		});

		return { success: true };
	}

	/**
	 * Generate next batch of bookings for active recurring bookings
	 * This would typically be called by a cron job
	 */
	async generateUpcomingBookings() {
		const activeRecurringBookings =
			await this.deps.db.recurringBooking.findMany({
				where: {
					status: "active",
					OR: [{ endDate: { gt: new Date() } }, { endDate: null }],
				},
				include: {
					bookings: {
						orderBy: { bookingDate: "desc" },
						take: 1,
					},
				},
			});

		const results = [];

		for (const recurringBooking of activeRecurringBookings) {
			try {
				// Get the last booking date
				const lastBookingDate =
					recurringBooking.bookings[0]?.bookingDate ||
					recurringBooking.startDate;

				// Calculate next batch of dates
				const bookingDates = this.calculateBookingDates({
					serviceId: recurringBooking.serviceId,
					frequency: recurringBooking.frequency as
						| "daily"
						| "weekly"
						| "biweekly"
						| "monthly",
					interval: recurringBooking.interval,
					startDate: addDays(lastBookingDate, 1),
					endDate: recurringBooking.endDate || undefined,
					occurrences: 4,
					daysOfWeek: recurringBooking.daysOfWeek,
					dayOfMonth: recurringBooking.dayOfMonth || undefined,
					timeSlot: recurringBooking.timeSlot,
					duration: recurringBooking.duration,
				});

				const bookingService = createBookingService({
					db: this.deps.db,
					currentUserId: recurringBooking.clientId,
				});

				for (const date of bookingDates) {
					const booking = await bookingService.createBooking({
						serviceId: recurringBooking.serviceId,
						bookingDate: date,
						isRecurring: true,
						recurringBookingId: recurringBooking.id,
					});
					results.push(booking);
				}
			} catch (error) {
				console.error(
					`Error generating bookings for recurring booking ${recurringBooking.id}:`,
					error,
				);
			}
		}

		return results;
	}
}

export function createRecurringBookingService(deps: RecurringBookingDeps) {
	return new RecurringBookingService(deps);
}
