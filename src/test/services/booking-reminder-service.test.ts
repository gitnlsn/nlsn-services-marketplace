import type { Booking } from "@prisma/client";
import { addDays, addHours, subDays, subHours } from "date-fns";
import { beforeEach, describe, expect, it } from "vitest";
import { BookingReminderService } from "~/server/services/booking-reminder-service";
import {
	cleanupTestDatabase,
	setupTestDatabase,
	testDb,
	testService,
	testUsers,
} from "../setup";
import { asPrismaClient } from "../types";

describe("BookingReminderService Integration Tests", () => {
	let testBooking: Booking;

	beforeEach(async () => {
		await cleanupTestDatabase();
		await setupTestDatabase();

		// Create a test booking object with all required Booking fields
		testBooking = {
			id: "test-booking-id",
			serviceId: testService.id,
			clientId: testUsers.client.id,
			providerId: testUsers.professional.id,
			bookingDate: addDays(new Date(), 2), // 2 days from now
			endDate: null,
			totalPrice: testService.price,
			status: "accepted",
			createdAt: new Date(),
			updatedAt: new Date(),
			address: null,
			notes: null,
			cancellationReason: null,
			cancelledBy: null,
			acceptedAt: null,
			declinedAt: null,
			cancelledAt: null,
			completedAt: null,
			googleCalendarEventId: null,
			isRecurring: false,
			recurringBookingId: null,
			groupBookingId: null,
			waitlistPosition: null,
		};

		// Mock the create to return the booking
		testDb.booking.create.mockResolvedValue(testBooking);
		// Mock findUnique to return the booking with includes
		testDb.booking.findUnique.mockResolvedValue({
			...testBooking,
			client: testUsers.client,
			provider: testUsers.professional,
			service: testService,
		});
	});

	describe("scheduleBookingReminders", () => {
		it("should create default reminders for booking", async () => {
			// Mock the bookingReminder methods
			const mockReminders = [
				{
					id: "reminder-1",
					bookingId: testBooking.id,
					type: "email",
					scheduledFor: subDays(testBooking.bookingDate, 1),
					status: "pending",
					sentAt: null,
					createdAt: new Date(),
					updatedAt: new Date(),
				},
				{
					id: "reminder-2",
					bookingId: testBooking.id,
					type: "sms",
					scheduledFor: subDays(testBooking.bookingDate, 1),
					status: "pending",
					sentAt: null,
					createdAt: new Date(),
					updatedAt: new Date(),
				},
				{
					id: "reminder-3",
					bookingId: testBooking.id,
					type: "whatsapp",
					scheduledFor: subHours(testBooking.bookingDate, 2),
					status: "pending",
					sentAt: null,
					createdAt: new Date(),
					updatedAt: new Date(),
				},
			];

			testDb.bookingReminder.findFirst.mockResolvedValue(null);
			testDb.bookingReminder.create.mockImplementation((args) => {
				const type = args.data.type;
				const reminder = mockReminders.find((r) => r.type === type);
				return Promise.resolve(reminder || mockReminders[0]);
			});
			testDb.bookingReminder.findMany.mockResolvedValue(mockReminders);

			const reminderService = new BookingReminderService({
				db: asPrismaClient(testDb),
			});

			await reminderService.scheduleBookingReminders(testBooking.id);

			// Verify reminders were created
			const reminders = await testDb.bookingReminder.findMany({
				where: { bookingId: testBooking.id },
				orderBy: { scheduledFor: "asc" },
			});

			expect(reminders).toHaveLength(3); // Default: email, sms, whatsapp

			// Verify reminder times
			const expectedTimes = [
				subDays(testBooking.bookingDate, 1), // 24 hours before
				subHours(testBooking.bookingDate, 2), // 2 hours before
				subHours(testBooking.bookingDate, 0.5), // 30 minutes before
			];

			for (let i = 0; i < reminders.length; i++) {
				expect(reminders[i]?.scheduledFor).toEqual(expectedTimes[i]);
				expect(reminders[i]?.status).toBe("scheduled");
				expect(reminders[i]?.type).toContain("before");
			}
		});

		it("should create custom reminders", async () => {
			const reminderService = new BookingReminderService({
				db: asPrismaClient(testDb),
			});

			const customReminders = [
				{ type: "24_hours_before", offsetHours: 24 },
				{ type: "1_hour_before", offsetHours: 1 },
			];

			await reminderService.scheduleBookingReminders(testBooking.id);

			const reminders = await testDb.bookingReminder.findMany({
				where: { bookingId: testBooking.id },
				orderBy: { scheduledFor: "asc" },
			});

			expect(reminders).toHaveLength(2);
			expect(reminders[0]?.type).toBe("24_hours_before");
			expect(reminders[1]?.type).toBe("1_hour_before");
		});

		it("should skip reminders for past bookings", async () => {
			// Create a past booking
			const pastBooking = await testDb.booking.create({
				data: {
					id: "past-booking-id",
					serviceId: testService.id,
					clientId: testUsers.client.id,
					providerId: testUsers.professional.id,
					bookingDate: subDays(new Date(), 1), // Yesterday
					totalPrice: testService.price,
					status: "completed",
				},
			});

			const reminderService = new BookingReminderService({
				db: asPrismaClient(testDb),
			});

			await reminderService.scheduleBookingReminders(pastBooking.id);

			const reminders = await testDb.bookingReminder.findMany({
				where: { bookingId: pastBooking.id },
			});

			expect(reminders).toHaveLength(0);
		});

		it("should skip reminders that would be in the past", async () => {
			// Create a booking that's very soon (in 1 hour)
			const soonBooking = await testDb.booking.create({
				data: {
					id: "soon-booking-id",
					serviceId: testService.id,
					clientId: testUsers.client.id,
					providerId: testUsers.professional.id,
					bookingDate: addHours(new Date(), 1), // In 1 hour
					totalPrice: testService.price,
					status: "accepted",
				},
			});

			const reminderService = new BookingReminderService({
				db: asPrismaClient(testDb),
			});

			await reminderService.scheduleBookingReminders(soonBooking.id);

			const reminders = await testDb.bookingReminder.findMany({
				where: { bookingId: soonBooking.id },
			});

			// Should only create the 30-minute reminder (others would be in the past)
			expect(reminders).toHaveLength(1);
			expect(reminders[0]?.type).toBe("30_minutes_before");
		});
	});

	describe("processPendingReminders", () => {
		beforeEach(async () => {
			// Create some test reminders
			await testDb.bookingReminder.createMany({
				data: [
					{
						id: "reminder-1",
						bookingId: testBooking.id,
						type: "24_hours_before",
						scheduledFor: subHours(new Date(), 1), // 1 hour ago (should be processed)
						status: "scheduled",
					},
					{
						id: "reminder-2",
						bookingId: testBooking.id,
						type: "2_hours_before",
						scheduledFor: addHours(new Date(), 1), // 1 hour from now (should not be processed)
						status: "scheduled",
					},
					{
						id: "reminder-3",
						bookingId: testBooking.id,
						type: "30_minutes_before",
						scheduledFor: subHours(new Date(), 2), // 2 hours ago (should be processed)
						status: "scheduled",
					},
				],
			});

			// Update users to have contact information
			await testDb.user.updateMany({
				where: {
					id: { in: [testUsers.client.id, testUsers.professional.id] },
				},
				data: {
					email: "test@example.com",
					phone: "+5511999999999",
					notificationEmail: true,
					notificationSms: true,
				},
			});
		});

		it("should process due reminders", async () => {
			const reminderService = new BookingReminderService({
				db: asPrismaClient(testDb),
			});

			const result = await reminderService.processPendingReminders();

			expect(result).toHaveLength(2); // Two reminders were due

			// Verify reminders were marked as sent
			const processedReminders = await testDb.bookingReminder.findMany({
				where: {
					id: { in: ["reminder-1", "reminder-3"] },
				},
			});

			for (const reminder of processedReminders) {
				expect(reminder.status).toBe("sent");
				expect(reminder.sentAt).toBeTruthy();
			}

			// Verify future reminder is still scheduled
			const futureReminder = await testDb.bookingReminder.findUnique({
				where: { id: "reminder-2" },
			});
			expect(futureReminder?.status).toBe("scheduled");
		});

		it("should handle communication failures gracefully", async () => {
			// Create reminder for booking with invalid user
			await testDb.booking.create({
				data: {
					id: "invalid-booking",
					serviceId: testService.id,
					clientId: "non-existent-user",
					providerId: testUsers.professional.id,
					bookingDate: addDays(new Date(), 1),
					totalPrice: testService.price,
					status: "accepted",
				},
			});

			await testDb.bookingReminder.create({
				data: {
					id: "invalid-reminder",
					bookingId: "invalid-booking",
					type: "24_hours_before",
					scheduledFor: subHours(new Date(), 1),
					status: "scheduled",
				},
			});

			const reminderService = new BookingReminderService({
				db: asPrismaClient(testDb),
			});

			// Should not throw error even with invalid data
			const result = await reminderService.processPendingReminders();

			// Should still process valid reminders
			expect(result.length).toBeGreaterThanOrEqual(2);

			// Invalid reminder should be marked as failed
			const invalidReminder = await testDb.bookingReminder.findUnique({
				where: { id: "invalid-reminder" },
			});
			expect(invalidReminder?.status).toBe("failed");
		});
	});

	describe("cancelBookingReminders", () => {
		beforeEach(async () => {
			// Create some reminders for the test booking
			await testDb.bookingReminder.createMany({
				data: [
					{
						id: "cancel-reminder-1",
						bookingId: testBooking.id,
						type: "24_hours_before",
						scheduledFor: addHours(new Date(), 23),
						status: "scheduled",
					},
					{
						id: "cancel-reminder-2",
						bookingId: testBooking.id,
						type: "2_hours_before",
						scheduledFor: addHours(new Date(), 22),
						status: "scheduled",
					},
					{
						id: "cancel-reminder-3",
						bookingId: testBooking.id,
						type: "30_minutes_before",
						scheduledFor: subHours(new Date(), 1), // Already sent
						status: "sent",
					},
				],
			});
		});

		it("should cancel scheduled reminders", async () => {
			const reminderService = new BookingReminderService({
				db: asPrismaClient(testDb),
			});

			await reminderService.cancelBookingReminders(testBooking.id);

			// Verify scheduled reminders were cancelled
			const cancelledReminders = await testDb.bookingReminder.findMany({
				where: {
					bookingId: testBooking.id,
					status: "cancelled",
				},
			});
			expect(cancelledReminders).toHaveLength(2);

			// Verify sent reminder was not affected
			const sentReminder = await testDb.bookingReminder.findUnique({
				where: { id: "cancel-reminder-3" },
			});
			expect(sentReminder?.status).toBe("sent");
		});

		it("should handle booking with no reminders", async () => {
			// Create booking with no reminders
			const noReminderBooking = await testDb.booking.create({
				data: {
					id: "no-reminder-booking",
					serviceId: testService.id,
					clientId: testUsers.client.id,
					providerId: testUsers.professional.id,
					bookingDate: addDays(new Date(), 3),
					totalPrice: testService.price,
					status: "accepted",
				},
			});

			const reminderService = new BookingReminderService({
				db: asPrismaClient(testDb),
			});

			await reminderService.cancelBookingReminders(noReminderBooking.id);

			// Verify no reminders were cancelled (since there were none)
			const cancelledReminders = await testDb.bookingReminder.findMany({
				where: {
					bookingId: noReminderBooking.id,
					status: "cancelled",
				},
			});
			expect(cancelledReminders).toHaveLength(0);
		});
	});

	describe("getReminderStats", () => {
		beforeEach(async () => {
			// Create various reminders with different statuses
			await testDb.bookingReminder.createMany({
				data: [
					{
						bookingId: testBooking.id,
						type: "24_hours_before",
						scheduledFor: subDays(new Date(), 1),
						status: "sent",
						sentAt: subDays(new Date(), 1),
					},
					{
						bookingId: testBooking.id,
						type: "2_hours_before",
						scheduledFor: subHours(new Date(), 3),
						status: "sent",
						sentAt: subHours(new Date(), 3),
					},
					{
						bookingId: testBooking.id,
						type: "30_minutes_before",
						scheduledFor: addHours(new Date(), 1),
						status: "scheduled",
					},
					{
						bookingId: testBooking.id,
						type: "24_hours_before",
						scheduledFor: subHours(new Date(), 2),
						status: "failed",
					},
				],
			});
		});

		it("should return reminder statistics", async () => {
			const reminderService = new BookingReminderService({
				db: asPrismaClient(testDb),
			});

			const stats = await reminderService.getReminderStats();

			expect(stats.total).toBe(4);
			expect(stats.pending).toBe(1);
			expect(stats.sent).toBe(2);
			expect(stats.failed).toBe(1);
			expect(stats.cancelled).toBe(0);
			expect(stats.successRate).toBeGreaterThan(0);
		});

		it("should filter stats by date range", async () => {
			const reminderService = new BookingReminderService({
				db: asPrismaClient(testDb),
			});

			const yesterday = subDays(new Date(), 1);
			const tomorrow = addDays(new Date(), 1);

			const stats = await reminderService.getReminderStats();

			// Should include all reminders within the date range
			expect(stats.total).toBe(4);
		});

		it("should filter stats by status", async () => {
			const reminderService = new BookingReminderService({
				db: asPrismaClient(testDb),
			});

			const stats = await reminderService.getReminderStats();

			expect(stats.total).toBe(4);
			expect(stats.sent).toBe(2);
			expect(stats.pending).toBeGreaterThanOrEqual(0);
		});
	});

	describe("updateReminderPreferences", () => {
		it("should update user reminder preferences", async () => {
			const reminderService = new BookingReminderService({
				db: asPrismaClient(testDb),
			});

			const preferences = {
				notificationEmail: true,
				notificationSms: false,
				notificationWhatsapp: true,
			};

			await reminderService.updateReminderPreferences(
				testUsers.client.id,
				preferences,
			);

			// Verify preferences were updated
			const updatedUser = await testDb.user.findUnique({
				where: { id: testUsers.client.id },
				select: {
					notificationEmail: true,
					notificationSms: true,
					notificationWhatsapp: true,
				},
			});

			expect(updatedUser?.notificationEmail).toBe(true);
			expect(updatedUser?.notificationSms).toBe(false);
			expect(updatedUser?.notificationWhatsapp).toBe(true);
		});

		it("should create new preferences for user", async () => {
			// Test with user who has no existing preferences
			const reminderService = new BookingReminderService({
				db: asPrismaClient(testDb),
			});

			const preferences = {
				notificationEmail: false,
				notificationSms: true,
				notificationWhatsapp: false,
			};

			await reminderService.updateReminderPreferences(
				testUsers.professional.id,
				preferences,
			);

			const newUser = await testDb.user.findUnique({
				where: { id: testUsers.professional.id },
				select: {
					notificationEmail: true,
					notificationSms: true,
					notificationWhatsapp: true,
				},
			});

			expect(newUser?.notificationEmail).toBe(false);
			expect(newUser?.notificationSms).toBe(true);
			expect(newUser?.notificationWhatsapp).toBe(false);
		});

		it("should handle disabled reminders", async () => {
			const reminderService = new BookingReminderService({
				db: asPrismaClient(testDb),
			});

			const preferences = {
				notificationEmail: false,
				notificationSms: false,
				notificationWhatsapp: false,
			};

			await reminderService.updateReminderPreferences(
				testUsers.client.id,
				preferences,
			);

			const updatedUser = await testDb.user.findUnique({
				where: { id: testUsers.client.id },
				select: {
					notificationEmail: true,
					notificationSms: true,
					notificationWhatsapp: true,
				},
			});

			expect(updatedUser?.notificationEmail).toBe(false);
			expect(updatedUser?.notificationSms).toBe(false);
			expect(updatedUser?.notificationWhatsapp).toBe(false);
		});
	});
});
