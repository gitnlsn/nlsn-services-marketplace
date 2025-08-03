import type { PrismaClient } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import {
	addDays,
	addMinutes,
	endOfDay,
	endOfWeek,
	format,
	isAfter,
	isBefore,
	isWithinInterval,
	parse,
	startOfDay,
	startOfWeek,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { z } from "zod";

// Input schemas
export const setAvailabilitySchema = z.object({
	dayOfWeek: z.number().min(0).max(6), // 0 = Sunday, 6 = Saturday
	startTime: z
		.string()
		.regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:MM)"),
	endTime: z
		.string()
		.regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:MM)"),
	isActive: z.boolean().default(true),
});

export const removeAvailabilitySchema = z.object({
	availabilityId: z.string().cuid(),
});

export const getAvailabilitySchema = z.object({
	providerId: z.string().cuid().optional(),
});

export const generateTimeSlotsSchema = z.object({
	providerId: z.string().cuid(),
	serviceId: z.string().cuid().optional(),
	startDate: z.date(),
	endDate: z.date(),
	duration: z.number().min(15).max(480), // Duration in minutes (15 min to 8 hours)
});

export const getAvailableTimeSlotsSchema = z.object({
	providerId: z.string().cuid(),
	serviceId: z.string().cuid().optional(),
	date: z.date(),
});

export const bookTimeSlotSchema = z.object({
	timeSlotId: z.string().cuid(),
	bookingId: z.string().cuid(),
});

export type SetAvailabilityInput = z.infer<typeof setAvailabilitySchema>;
export type RemoveAvailabilityInput = z.infer<typeof removeAvailabilitySchema>;
export type GetAvailabilityInput = z.infer<typeof getAvailabilitySchema>;
export type GenerateTimeSlotsInput = z.infer<typeof generateTimeSlotsSchema>;
export type GetAvailableTimeSlotsInput = z.infer<
	typeof getAvailableTimeSlotsSchema
>;
export type BookTimeSlotInput = z.infer<typeof bookTimeSlotSchema>;

interface AvailabilityServiceDeps {
	db: PrismaClient;
	currentUser: { id: string };
}

export function createAvailabilityService(deps: AvailabilityServiceDeps) {
	return new AvailabilityService(deps);
}

class AvailabilityService {
	constructor(private deps: AvailabilityServiceDeps) {}

	/**
	 * Set weekly availability for a provider
	 */
	async setAvailability(input: SetAvailabilityInput) {
		// Validate times
		const startTime = parse(input.startTime, "HH:mm", new Date());
		const endTime = parse(input.endTime, "HH:mm", new Date());

		if (
			isAfter(startTime, endTime) ||
			format(startTime, "HH:mm") === format(endTime, "HH:mm")
		) {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: "End time must be after start time",
			});
		}

		// Check if provider is professional
		const user = await this.deps.db.user.findUnique({
			where: { id: this.deps.currentUser.id },
		});

		if (!user?.isProfessional) {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: "Only professionals can set availability",
			});
		}

		// Create or update availability
		const availability = await this.deps.db.availability.upsert({
			where: {
				providerId_dayOfWeek_startTime_endTime: {
					providerId: this.deps.currentUser.id,
					dayOfWeek: input.dayOfWeek,
					startTime: input.startTime,
					endTime: input.endTime,
				},
			},
			update: {
				isActive: input.isActive,
			},
			create: {
				providerId: this.deps.currentUser.id,
				dayOfWeek: input.dayOfWeek,
				startTime: input.startTime,
				endTime: input.endTime,
				isActive: input.isActive,
			},
		});

		return availability;
	}

	/**
	 * Remove availability slot
	 */
	async removeAvailability(input: RemoveAvailabilityInput) {
		const availability = await this.deps.db.availability.findUnique({
			where: { id: input.availabilityId },
		});

		if (!availability) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Availability not found",
			});
		}

		if (availability.providerId !== this.deps.currentUser.id) {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: "You can only remove your own availability",
			});
		}

		await this.deps.db.availability.delete({
			where: { id: input.availabilityId },
		});

		return { success: true };
	}

	/**
	 * Get weekly availability for a provider
	 */
	async getAvailability(input: GetAvailabilityInput) {
		const providerId = input.providerId || this.deps.currentUser.id;

		const availabilities = await this.deps.db.availability.findMany({
			where: {
				providerId,
				isActive: true,
			},
			orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
		});

		// Group by day of week
		const grouped = availabilities.reduce(
			(acc, availability) => {
				if (!acc[availability.dayOfWeek]) {
					acc[availability.dayOfWeek] = [];
				}
				acc[availability.dayOfWeek]?.push(availability);
				return acc;
			},
			{} as Record<number, typeof availabilities>,
		);

		return grouped;
	}

	/**
	 * Generate time slots based on availability
	 */
	async generateTimeSlots(input: GenerateTimeSlotsInput) {
		const { providerId, serviceId, startDate, endDate, duration } = input;

		// Get provider's availability
		const availabilities = await this.deps.db.availability.findMany({
			where: {
				providerId,
				isActive: true,
			},
		});

		if (availabilities.length === 0) {
			return [];
		}

		// Get existing bookings to avoid conflicts
		const existingTimeSlots = await this.deps.db.timeSlot.findMany({
			where: {
				providerId,
				date: {
					gte: startOfDay(startDate),
					lte: endOfDay(endDate),
				},
			},
		});

		const timeSlots = [];
		let currentDate = startOfDay(startDate);

		while (isBefore(currentDate, endOfDay(endDate))) {
			const dayOfWeek = currentDate.getDay();
			const dayAvailabilities = availabilities.filter(
				(a) => a.dayOfWeek === dayOfWeek,
			);

			for (const availability of dayAvailabilities) {
				const dayStart = parse(availability.startTime, "HH:mm", currentDate);
				const dayEnd = parse(availability.endTime, "HH:mm", currentDate);
				let slotStart = dayStart;

				while (
					isBefore(addMinutes(slotStart, duration), dayEnd) ||
					format(addMinutes(slotStart, duration), "HH:mm") ===
						format(dayEnd, "HH:mm")
				) {
					const slotEnd = addMinutes(slotStart, duration);

					// Check if slot already exists
					const exists = existingTimeSlots.some(
						(slot) =>
							format(slot.date, "yyyy-MM-dd") ===
								format(currentDate, "yyyy-MM-dd") &&
							format(slot.startTime, "HH:mm") === format(slotStart, "HH:mm"),
					);

					if (!exists) {
						timeSlots.push({
							providerId,
							serviceId,
							date: currentDate,
							startTime: slotStart,
							endTime: slotEnd,
							isBooked: false,
						});
					}

					slotStart = slotEnd;
				}
			}

			currentDate = addDays(currentDate, 1);
		}

		// Bulk create time slots
		if (timeSlots.length > 0) {
			await this.deps.db.timeSlot.createMany({
				data: timeSlots,
			});
		}

		return timeSlots;
	}

	/**
	 * Get available time slots for a specific date
	 */
	async getAvailableTimeSlots(input: GetAvailableTimeSlotsInput) {
		const { providerId, serviceId, date } = input;

		const timeSlots = await this.deps.db.timeSlot.findMany({
			where: {
				providerId,
				serviceId: serviceId || undefined,
				date: {
					gte: startOfDay(date),
					lte: endOfDay(date),
				},
				isBooked: false,
			},
			orderBy: {
				startTime: "asc",
			},
			include: {
				service: {
					select: {
						id: true,
						title: true,
						duration: true,
						price: true,
					},
				},
			},
		});

		// Filter out past time slots
		const now = new Date();
		const futureSlots = timeSlots.filter((slot) =>
			isAfter(slot.startTime, now),
		);

		return futureSlots;
	}

	/**
	 * Book a time slot
	 */
	async bookTimeSlot(input: BookTimeSlotInput) {
		const { timeSlotId, bookingId } = input;

		// Verify time slot exists and is available
		const timeSlot = await this.deps.db.timeSlot.findUnique({
			where: { id: timeSlotId },
		});

		if (!timeSlot) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Time slot not found",
			});
		}

		if (timeSlot.isBooked) {
			throw new TRPCError({
				code: "CONFLICT",
				message: "Time slot is already booked",
			});
		}

		// Verify booking exists and belongs to current user
		const booking = await this.deps.db.booking.findUnique({
			where: { id: bookingId },
			include: { service: true },
		});

		if (!booking) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Booking not found",
			});
		}

		if (
			booking.clientId !== this.deps.currentUser.id &&
			booking.providerId !== this.deps.currentUser.id
		) {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: "You don't have permission to book this time slot",
			});
		}

		// Update time slot
		const updatedTimeSlot = await this.deps.db.timeSlot.update({
			where: { id: timeSlotId },
			data: {
				isBooked: true,
				bookingId: bookingId,
			},
		});

		// Update booking with time slot details
		await this.deps.db.booking.update({
			where: { id: bookingId },
			data: {
				bookingDate: timeSlot.startTime,
				endDate: timeSlot.endTime,
			},
		});

		return updatedTimeSlot;
	}

	/**
	 * Release a time slot (make it available again)
	 */
	async releaseTimeSlot(timeSlotId: string) {
		const timeSlot = await this.deps.db.timeSlot.findUnique({
			where: { id: timeSlotId },
			include: { booking: true },
		});

		if (!timeSlot) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Time slot not found",
			});
		}

		// Check permissions
		if (
			timeSlot.providerId !== this.deps.currentUser.id &&
			timeSlot.booking?.clientId !== this.deps.currentUser.id
		) {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: "You don't have permission to release this time slot",
			});
		}

		// Update time slot
		const updatedTimeSlot = await this.deps.db.timeSlot.update({
			where: { id: timeSlotId },
			data: {
				isBooked: false,
				bookingId: null,
			},
		});

		return updatedTimeSlot;
	}

	/**
	 * Get provider's schedule for a week
	 */
	async getWeeklySchedule(providerId: string, weekStart: Date) {
		const weekEnd = endOfWeek(weekStart, { locale: ptBR });

		const timeSlots = await this.deps.db.timeSlot.findMany({
			where: {
				providerId,
				date: {
					gte: startOfWeek(weekStart, { locale: ptBR }),
					lte: weekEnd,
				},
			},
			include: {
				booking: {
					include: {
						client: {
							select: {
								id: true,
								name: true,
								email: true,
								phone: true,
							},
						},
						service: {
							select: {
								id: true,
								title: true,
								price: true,
							},
						},
					},
				},
			},
			orderBy: {
				startTime: "asc",
			},
		});

		// Group by date
		const grouped = timeSlots.reduce(
			(acc, slot) => {
				const dateKey = format(slot.date, "yyyy-MM-dd");
				if (!acc[dateKey]) {
					acc[dateKey] = [];
				}
				acc[dateKey].push(slot);
				return acc;
			},
			{} as Record<string, typeof timeSlots>,
		);

		return grouped;
	}
}
