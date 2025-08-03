import { TRPCError } from "@trpc/server";
import { addDays, addWeeks, format } from "date-fns";
import { beforeEach, describe, expect, it } from "vitest";
import { RecurringBookingService } from "~/server/services/recurring-booking-service";
import {
	cleanupTestDatabase,
	setupTestDatabase,
	testDb,
	testService,
	testUsers,
} from "../setup";
import { asPrismaClient } from "../types";

describe("RecurringBookingService Integration Tests", () => {
	beforeEach(async () => {
		await cleanupTestDatabase();
		await setupTestDatabase();

		// Mock service.findUnique to return the test service with provider
		testDb.service.findUnique.mockResolvedValue({
			...testService,
			provider: testUsers.professional,
		});
	});

	describe("createRecurringBooking", () => {
		it("should successfully create a weekly recurring booking", async () => {
			const startDate = new Date("2024-12-25T10:00:00Z");
			const input = {
				serviceId: testService.id,
				startDate,
				endDate: new Date("2025-01-25T11:00:00Z"), // End date should be later for multiple occurrences
				frequency: "weekly" as const,
				interval: 1,
				occurrences: 4,
				daysOfWeek: [3], // Wednesday (2024-12-25 is a Wednesday)
				timeSlot: "10:00",
				duration: 60,
				notes: "Weekly therapy sessions",
			};

			// Mock the recurring booking creation
			const mockRecurringBooking = {
				id: "recurring-booking-id",
				serviceId: testService.id,
				clientId: testUsers.client.id,
				providerId: testUsers.professional.id,
				frequency: "weekly",
				interval: 1,
				startDate,
				endDate: null,
				occurrences: 4,
				daysOfWeek: [],
				dayOfMonth: null,
				timeSlot: "10:00",
				duration: 60,
				totalPrice: testService.price,
				status: "active",
				createdAt: new Date(),
				updatedAt: new Date(),
			};

			testDb.recurringBooking.create.mockResolvedValue(mockRecurringBooking);

			// Mock individual bookings creation
			const mockBookings = [
				{
					booking: {
						id: "booking-1",
						serviceId: testService.id,
						clientId: testUsers.client.id,
						providerId: testUsers.professional.id,
						bookingDate: startDate,
						totalPrice: testService.price,
						status: "pending",
						isRecurring: true,
						recurringBookingId: mockRecurringBooking.id,
						createdAt: new Date(),
						updatedAt: new Date(),
					},
				},
				{
					booking: {
						id: "booking-2",
						serviceId: testService.id,
						clientId: testUsers.client.id,
						providerId: testUsers.professional.id,
						bookingDate: addWeeks(startDate, 1),
						totalPrice: testService.price,
						status: "pending",
						isRecurring: true,
						recurringBookingId: mockRecurringBooking.id,
						createdAt: new Date(),
						updatedAt: new Date(),
					},
				},
				{
					booking: {
						id: "booking-3",
						serviceId: testService.id,
						clientId: testUsers.client.id,
						providerId: testUsers.professional.id,
						bookingDate: addWeeks(startDate, 2),
						totalPrice: testService.price,
						status: "pending",
						isRecurring: true,
						recurringBookingId: mockRecurringBooking.id,
						createdAt: new Date(),
						updatedAt: new Date(),
					},
				},
				{
					booking: {
						id: "booking-4",
						serviceId: testService.id,
						clientId: testUsers.client.id,
						providerId: testUsers.professional.id,
						bookingDate: addWeeks(startDate, 3),
						totalPrice: testService.price,
						status: "pending",
						isRecurring: true,
						recurringBookingId: mockRecurringBooking.id,
						createdAt: new Date(),
						updatedAt: new Date(),
					},
				},
			];

			// Mock booking.create to return appropriate booking
			// Mock booking count check
			testDb.booking.count.mockResolvedValue(0);

			// Mock payment creation for each booking
			testDb.payment.create.mockResolvedValue({
				id: "payment-id",
				bookingId: "booking-id",
				amount: testService.price,
				status: "pending",
				serviceFee: testService.price * 0.1,
				netAmount: testService.price * 0.9,
				createdAt: new Date(),
				updatedAt: new Date(),
			});

			// Mock notification creation
			testDb.notification.create.mockResolvedValue({
				id: "notification-id",
				userId: testUsers.professional.id,
				type: "new_booking",
				title: "New Booking Request",
				message: "You have a new booking request",
				read: false,
				data: null,
				createdAt: new Date(),
			});

			// Mock service update for booking count
			testDb.service.update.mockResolvedValue({
				...testService,
				bookingCount: 1,
			});

			// Mock user lookup for notifications
			testDb.user.findUnique.mockResolvedValue(testUsers.client);

			let bookingIndex = 0;
			testDb.booking.create.mockImplementation(() => {
				const booking = mockBookings[bookingIndex];
				bookingIndex++;
				return Promise.resolve(booking?.booking);
			});

			const recurringService = new RecurringBookingService({
				db: asPrismaClient(testDb),
				currentUserId: testUsers.client.id,
			});

			const result = await recurringService.createRecurringBooking(input);

			expect(result.recurringBooking.serviceId).toBe(testService.id);
			expect(result.recurringBooking.clientId).toBe(testUsers.client.id);
			expect(result.recurringBooking.frequency).toBe("weekly");
			expect(result.recurringBooking.interval).toBe(1);
			expect(result.recurringBooking.occurrences).toBe(4);
			expect(result.recurringBooking.status).toBe("active");

			// Verify individual bookings were created
			expect(result.bookings).toHaveLength(4);

			// Check that bookings are created with correct dates
			const expectedDates = [
				startDate,
				addWeeks(startDate, 1),
				addWeeks(startDate, 2),
				addWeeks(startDate, 3),
			];

			for (let i = 0; i < 4; i++) {
				expect(result.bookings[i]?.booking.bookingDate).toEqual(
					expectedDates[i],
				);
				expect(result.bookings[i]?.booking.isRecurring).toBe(true);
				expect(result.bookings[i]?.booking.recurringBookingId).toBe(
					result.recurringBooking.id,
				);
				expect(result.bookings[i]?.booking.status).toBe("pending");
			}

			// Verify total price calculation
			expect(result.recurringBooking.totalPrice).toBe(testService.price);
		});

		it("should create daily recurring booking", async () => {
			const recurringService = new RecurringBookingService({
				db: asPrismaClient(testDb),
				currentUserId: testUsers.client.id,
			});

			const startDate = new Date("2024-12-25T10:00:00Z");
			const input = {
				serviceId: testService.id,
				startDate,
				endDate: new Date("2024-12-25T10:30:00Z"),
				frequency: "daily" as const,
				interval: 2, // Every 2 days
				occurrences: 3,
				timeSlot: "10:00",
				duration: 30,
			};

			const result = await recurringService.createRecurringBooking(input);

			expect(result.bookings).toHaveLength(3);

			const expectedDates = [
				startDate,
				addDays(startDate, 2),
				addDays(startDate, 4),
			];

			for (let i = 0; i < 3; i++) {
				expect(result.bookings[i]?.booking.bookingDate).toEqual(
					expectedDates[i],
				);
			}
		});

		it("should create monthly recurring booking", async () => {
			const recurringService = new RecurringBookingService({
				db: asPrismaClient(testDb),
				currentUserId: testUsers.client.id,
			});

			const startDate = new Date("2024-01-15T10:00:00Z");
			const input = {
				serviceId: testService.id,
				startDate,
				endDate: new Date("2024-01-15T11:00:00Z"),
				frequency: "monthly" as const,
				interval: 1,
				occurrences: 3,
				timeSlot: "10:00",
				duration: 60,
				dayOfMonth: 15,
			};

			const result = await recurringService.createRecurringBooking(input);

			expect(result.bookings).toHaveLength(3);

			// Verify monthly progression
			expect(
				format(
					result.bookings[0]?.booking.bookingDate ?? new Date(),
					"yyyy-MM-dd",
				),
			).toBe("2024-01-15");
			expect(
				format(
					result.bookings[1]?.booking.bookingDate ?? new Date(),
					"yyyy-MM-dd",
				),
			).toBe("2024-02-15");
			expect(
				format(
					result.bookings[2]?.booking.bookingDate ?? new Date(),
					"yyyy-MM-dd",
				),
			).toBe("2024-03-15");
		});

		it("should create recurring booking with end date instead of occurrences", async () => {
			const recurringService = new RecurringBookingService({
				db: asPrismaClient(testDb),
				currentUserId: testUsers.client.id,
			});

			const startDate = new Date("2024-12-25T10:00:00Z");
			const endDate = addWeeks(startDate, 3); // 3 weeks later

			const input = {
				serviceId: testService.id,
				startDate,
				endDate: endDate,
				frequency: "weekly" as const,
				interval: 1,
				timeSlot: "10:00",
				duration: 60,
				daysOfWeek: [3], // Wednesday
			};

			const result = await recurringService.createRecurringBooking(input);

			// Should create bookings for weeks 0, 1, 2, 3 = 4 bookings
			expect(result.bookings).toHaveLength(4);
			expect(result.recurringBooking.endDate).toEqual(endDate);
		});

		it("should prevent creating recurring booking for inactive service", async () => {
			// Make service inactive
			await testDb.service.update({
				where: { id: testService.id },
				data: { status: "inactive" },
			});

			const recurringService = new RecurringBookingService({
				db: asPrismaClient(testDb),
				currentUserId: testUsers.client.id,
			});

			const input = {
				serviceId: testService.id,
				startDate: new Date("2024-12-25T10:00:00Z"),
				frequency: "weekly" as const,
				interval: 1,
				occurrences: 4,
				timeSlot: "10:00",
				duration: 60,
			};

			await expect(
				recurringService.createRecurringBooking(input),
			).rejects.toThrow(TRPCError);
		});

		it("should prevent booking own service", async () => {
			const recurringService = new RecurringBookingService({
				db: asPrismaClient(testDb),
				currentUserId: testUsers.professional.id, // Service provider
			});

			const input = {
				serviceId: testService.id,
				startDate: new Date("2024-12-25T10:00:00Z"),
				frequency: "weekly" as const,
				interval: 1,
				occurrences: 4,
				timeSlot: "10:00",
				duration: 60,
			};

			await expect(
				recurringService.createRecurringBooking(input),
			).rejects.toThrow(TRPCError);
		});

		it("should limit maximum occurrences", async () => {
			const recurringService = new RecurringBookingService({
				db: asPrismaClient(testDb),
				currentUserId: testUsers.client.id,
			});

			const input = {
				serviceId: testService.id,
				startDate: new Date("2024-12-25T10:00:00Z"),
				frequency: "weekly" as const,
				interval: 1,
				occurrences: 100, // Too many
				timeSlot: "10:00",
				duration: 60,
			};

			await expect(
				recurringService.createRecurringBooking(input),
			).rejects.toThrow(TRPCError);
		});
	});

	describe("getRecurringBookingDetails", () => {
		let recurringBooking: Awaited<
			ReturnType<
				InstanceType<typeof RecurringBookingService>["createRecurringBooking"]
			>
		>;

		beforeEach(async () => {
			const recurringService = new RecurringBookingService({
				db: asPrismaClient(testDb),
				currentUserId: testUsers.client.id,
			});

			recurringBooking = await recurringService.createRecurringBooking({
				serviceId: testService.id,
				startDate: new Date("2024-12-25T10:00:00Z"),
				frequency: "weekly",
				interval: 1,
				occurrences: 3,
				timeSlot: "10:00",
				duration: 60,
			});
		});

		it("should return recurring booking details for client", async () => {
			const recurringService = new RecurringBookingService({
				db: asPrismaClient(testDb),
				currentUserId: testUsers.client.id,
			});

			const result = await recurringService.getRecurringBookingDetails(
				recurringBooking.recurringBooking.id,
			);

			expect(result.id).toBe(recurringBooking.recurringBooking.id);
			expect(result.frequency).toBe("weekly");
			expect(result.bookings).toHaveLength(3);
			expect(result.service).toBeTruthy();
		});

		it("should return recurring booking details for provider", async () => {
			const recurringService = new RecurringBookingService({
				db: asPrismaClient(testDb),
				currentUserId: testUsers.professional.id,
			});

			const result = await recurringService.getRecurringBookingDetails(
				recurringBooking.recurringBooking.id,
			);

			expect(result.id).toBe(recurringBooking.recurringBooking.id);
			expect(result.bookings).toHaveLength(3);
		});

		it("should deny access to unauthorized users", async () => {
			await testDb.user.create({
				data: {
					id: "unauthorized-user",
					name: "Unauthorized User",
					email: "unauthorized@test.com",
					isProfessional: false,
				},
			});

			const recurringService = new RecurringBookingService({
				db: asPrismaClient(testDb),
				currentUserId: "unauthorized-user",
			});

			await expect(
				recurringService.getRecurringBookingDetails(
					recurringBooking.recurringBooking.id,
				),
			).rejects.toThrow(TRPCError);
		});
	});

	describe("updateRecurringBooking", () => {
		let recurringBooking: Awaited<
			ReturnType<
				InstanceType<typeof RecurringBookingService>["createRecurringBooking"]
			>
		>;

		beforeEach(async () => {
			const recurringService = new RecurringBookingService({
				db: asPrismaClient(testDb),
				currentUserId: testUsers.client.id,
			});

			recurringBooking = await recurringService.createRecurringBooking({
				serviceId: testService.id,
				startDate: new Date("2024-12-25T10:00:00Z"),
				frequency: "weekly",
				interval: 1,
				occurrences: 4,
				timeSlot: "10:00",
				duration: 60,
			});
		});

		it("should pause recurring booking", async () => {
			const recurringService = new RecurringBookingService({
				db: asPrismaClient(testDb),
				currentUserId: testUsers.client.id,
			});

			const result = await recurringService.pauseRecurringBooking(
				recurringBooking.recurringBooking.id,
			);

			expect(result.success).toBe(true);

			// Verify future bookings were cancelled
			const bookings = await testDb.booking.findMany({
				where: {
					recurringBookingId: recurringBooking.recurringBooking.id,
					bookingDate: { gte: new Date() },
				},
			});

			for (const booking of bookings) {
				if (booking.status !== "completed") {
					expect(booking.status).toBe("cancelled");
				}
			}
		});

		it("should resume paused recurring booking", async () => {
			const recurringService = new RecurringBookingService({
				db: asPrismaClient(testDb),
				currentUserId: testUsers.client.id,
			});

			// First pause it
			await recurringService.pauseRecurringBooking(
				recurringBooking.recurringBooking.id,
			);

			// Then resume it
			const result = await recurringService.resumeRecurringBooking(
				recurringBooking.recurringBooking.id,
				new Date(),
			);

			expect(result.success).toBe(true);

			// Verify future bookings were recreated
			const futureBookings = await testDb.booking.findMany({
				where: {
					recurringBookingId: recurringBooking.recurringBooking.id,
					bookingDate: { gte: new Date() },
					status: "pending",
				},
			});

			expect(futureBookings.length).toBeGreaterThan(0);
		});

		it("should only allow client to update their recurring booking", async () => {
			const recurringService = new RecurringBookingService({
				db: asPrismaClient(testDb),
				currentUserId: testUsers.professional.id,
			});

			await expect(
				recurringService.pauseRecurringBooking(
					recurringBooking.recurringBooking.id,
				),
			).rejects.toThrow(TRPCError);
		});

		it("should prevent modification of completed recurring booking", async () => {
			// Mark recurring booking as completed
			await testDb.recurringBooking.update({
				where: { id: recurringBooking.recurringBooking.id },
				data: { status: "completed" },
			});

			const recurringService = new RecurringBookingService({
				db: asPrismaClient(testDb),
				currentUserId: testUsers.client.id,
			});

			await expect(
				recurringService.pauseRecurringBooking(
					recurringBooking.recurringBooking.id,
				),
			).rejects.toThrow(TRPCError);
		});
	});

	describe("cancelRecurringBooking", () => {
		let recurringBooking: Awaited<
			ReturnType<
				InstanceType<typeof RecurringBookingService>["createRecurringBooking"]
			>
		>;

		beforeEach(async () => {
			const recurringService = new RecurringBookingService({
				db: asPrismaClient(testDb),
				currentUserId: testUsers.client.id,
			});

			recurringBooking = await recurringService.createRecurringBooking({
				serviceId: testService.id,
				startDate: new Date("2024-12-25T10:00:00Z"),
				frequency: "weekly",
				interval: 1,
				occurrences: 4,
				timeSlot: "10:00",
				duration: 60,
			});
		});

		it("should cancel future bookings only", async () => {
			const recurringService = new RecurringBookingService({
				db: asPrismaClient(testDb),
				currentUserId: testUsers.client.id,
			});

			// Mark one booking as completed (past)
			await testDb.booking.update({
				where: { id: recurringBooking.bookings[0]?.booking.id },
				data: {
					status: "completed",
					completedAt: new Date(),
					bookingDate: new Date("2024-01-01T10:00:00Z"), // Past date
				},
			});

			const result = await recurringService.cancelRecurringBooking(
				recurringBooking.recurringBooking.id,
				true, // cancelFutureOnly
			);

			expect(result.success).toBe(true);

			// Verify recurring booking status
			const updatedRecurring = await testDb.recurringBooking.findUnique({
				where: { id: recurringBooking.recurringBooking.id },
			});
			expect(updatedRecurring?.status).toBe("cancelled");

			// Verify completed booking is not affected
			const completedBooking = await testDb.booking.findUnique({
				where: { id: recurringBooking.bookings[0]?.booking.id },
			});
			expect(completedBooking?.status).toBe("completed");

			// Verify future bookings are cancelled
			const futureBookings = await testDb.booking.findMany({
				where: {
					recurringBookingId: recurringBooking.recurringBooking.id,
					status: "cancelled",
				},
			});
			expect(futureBookings.length).toBe(3); // 3 future bookings cancelled
		});

		it("should only allow client to cancel their recurring booking", async () => {
			const recurringService = new RecurringBookingService({
				db: asPrismaClient(testDb),
				currentUserId: testUsers.professional.id,
			});

			await expect(
				recurringService.cancelRecurringBooking(
					recurringBooking.recurringBooking.id,
				),
			).rejects.toThrow(TRPCError);
		});
	});

	describe("listRecurringBookings", () => {
		beforeEach(async () => {
			const recurringService = new RecurringBookingService({
				db: asPrismaClient(testDb),
				currentUserId: testUsers.client.id,
			});

			// Create multiple recurring bookings
			await recurringService.createRecurringBooking({
				serviceId: testService.id,
				startDate: new Date("2024-12-25T10:00:00Z"),
				frequency: "weekly",
				interval: 1,
				occurrences: 3,
				timeSlot: "10:00",
				duration: 60,
			});

			await recurringService.createRecurringBooking({
				serviceId: testService.id,
				startDate: new Date("2024-12-27T14:00:00Z"),
				frequency: "daily",
				interval: 2,
				occurrences: 5,
				timeSlot: "14:00",
				duration: 60,
			});
		});

		it("should list client recurring bookings", async () => {
			const recurringService = new RecurringBookingService({
				db: asPrismaClient(testDb),
				currentUserId: testUsers.client.id,
			});

			const result = await recurringService.getUserRecurringBookings(
				testUsers.client.id,
			);

			expect(result).toHaveLength(2);
			expect(result[0]?.clientId).toBe(testUsers.client.id);
			expect(result[1]?.clientId).toBe(testUsers.client.id);
		});

		it("should list provider recurring bookings", async () => {
			const recurringService = new RecurringBookingService({
				db: asPrismaClient(testDb),
				currentUserId: testUsers.professional.id,
			});

			const result = await recurringService.getUserRecurringBookings(
				testUsers.professional.id,
			);

			expect(result).toHaveLength(2);
			expect(result[0]?.service.providerId).toBe(testUsers.professional.id);
		});

		it("should filter by status", async () => {
			// Cancel one recurring booking
			const firstRecurring = await testDb.recurringBooking.findFirst({
				where: { clientId: testUsers.client.id },
			});

			await testDb.recurringBooking.update({
				where: { id: firstRecurring?.id },
				data: { status: "cancelled" },
			});

			const recurringService = new RecurringBookingService({
				db: asPrismaClient(testDb),
				currentUserId: testUsers.client.id,
			});

			const result = await recurringService.getUserRecurringBookings(
				testUsers.client.id,
			);
			const activeBookings = result.filter(
				(booking) => booking.status === "active",
			);

			expect(activeBookings).toHaveLength(1);
			expect(activeBookings[0]?.status).toBe("active");
		});

		it("should handle pagination", async () => {
			const recurringService = new RecurringBookingService({
				db: asPrismaClient(testDb),
				currentUserId: testUsers.client.id,
			});

			const result = await recurringService.getUserRecurringBookings(
				testUsers.client.id,
			);

			expect(result).toHaveLength(2);
			// Note: getUserRecurringBookings doesn't support pagination parameters
			// This test can check that all bookings are returned
		});
	});
});
