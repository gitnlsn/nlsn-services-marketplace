import { TRPCError } from "@trpc/server";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createBookingService } from "~/server/services/booking-service";
import {
	createTestBooking,
	createTestCategory,
	createTestProfessional,
	createTestService,
	createTestUser,
	setupTestDatabase,
	teardownTestDatabase,
	testDb,
} from "../helpers/database";
import { asPrismaClient } from "../types";

describe("BookingService Integration Tests", () => {
	setupTestDatabase();

	let bookingService: ReturnType<typeof createBookingService>;
	let testProfessional: Awaited<ReturnType<typeof createTestProfessional>>;
	let testUser: Awaited<ReturnType<typeof createTestUser>>;
	let testCategory: Awaited<ReturnType<typeof createTestCategory>>;
	let testService: Awaited<ReturnType<typeof createTestService>>;

	beforeAll(async () => {
		testProfessional = await createTestProfessional();
		testUser = await createTestUser();
		testCategory = await createTestCategory();
		testService = await createTestService(testProfessional.id, testCategory.id);

		bookingService = createBookingService({
			db: asPrismaClient(testDb),
			currentUser: testUser,
			currentUserId: testUser.id,
		});
	});

	afterAll(async () => {
		await teardownTestDatabase();
	});

	describe("createBooking", () => {
		it("should create booking for active service", async () => {
			const bookingData = {
				serviceId: testService.id,
				bookingDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
				notes: "Test booking notes",
				address: "Test Address, 123",
			};

			const result = await bookingService.createBooking(bookingData);

			expect(result.booking.serviceId).toBe(testService.id);
			expect(result.booking.clientId).toBe(testUser.id);
			expect(result.booking.providerId).toBe(testProfessional.id);
			expect(result.booking.status).toBe("pending");
			expect(result.payment.amount).toBe(testService.price);
			expect(result.payment.status).toBe("pending");
		});

		it("should prevent booking own service", async () => {
			const bookingData = {
				serviceId: testService.id,
				bookingDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
			};

			await expect(bookingService.createBooking(bookingData)).rejects.toThrow(
				"Cannot book your own service",
			);
		});

		it("should prevent booking inactive service", async () => {
			const inactiveService = await createTestService(
				testProfessional.id,
				testCategory.id,
				{ status: "inactive" },
			);

			const bookingData = {
				serviceId: inactiveService.id,
				bookingDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
			};

			await expect(bookingService.createBooking(bookingData)).rejects.toThrow(
				"Service is not available for booking",
			);
		});

		it("should calculate hourly pricing correctly", async () => {
			const hourlyService = await createTestService(
				testProfessional.id,
				testCategory.id,
				{
					priceType: "hourly",
					price: 5000, // R$ 50/hour
				},
			);

			const startDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
			const endDate = new Date(startDate.getTime() + 3 * 60 * 60 * 1000); // 3 hours later

			const bookingData = {
				serviceId: hourlyService.id,
				bookingDate: startDate,
				endDate,
			};

			const result = await bookingService.createBooking(bookingData);

			expect(result.booking.totalPrice).toBe(15000); // 3 hours * R$ 50 = R$ 150
		});

		it("should respect max bookings limit", async () => {
			const limitedService = await createTestService(
				testProfessional.id,
				testCategory.id,
				{ maxBookings: 1 },
			);

			const bookingDate = new Date(Date.now() + 24 * 60 * 60 * 1000);

			// Create first booking
			await bookingService.createBooking({
				serviceId: limitedService.id,
				bookingDate,
			});

			// Try to create second booking for same date
			await expect(
				bookingService.createBooking({
					serviceId: limitedService.id,
					bookingDate,
				}),
			).rejects.toThrow("Service is fully booked for this date");
		});

		it("should create notification for provider", async () => {
			const bookingData = {
				serviceId: testService.id,
				bookingDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
			};

			await bookingService.createBooking(bookingData);

			const notification = await testDb.notification.findFirst({
				where: {
					userId: testProfessional.id,
					type: "new_booking",
				},
			});

			expect(notification).toBeDefined();
			expect(notification?.title).toBe("New Booking Request");
		});
	});

	describe("acceptBooking", () => {
		it("should accept pending booking", async () => {
			const booking = await createTestBooking(
				testService.id,
				testUser.id,
				testProfessional.id,
			);

			const result = await bookingService.acceptBooking({
				bookingId: booking.id,
			});

			expect(result.status).toBe("accepted");

			// Check notification was created
			const notification = await testDb.notification.findFirst({
				where: {
					userId: testUser.id,
					type: "booking_accepted",
				},
			});
			expect(notification).toBeDefined();
		});

		it("should reject acceptance by non-provider", async () => {
			const booking = await createTestBooking(
				testService.id,
				testUser.id,
				testProfessional.id,
			);

			await expect(
				bookingService.acceptBooking({ bookingId: booking.id }),
			).rejects.toThrow("Only the service provider can accept this booking");
		});

		it("should reject acceptance of non-pending booking", async () => {
			const booking = await createTestBooking(
				testService.id,
				testUser.id,
				testProfessional.id,
				{ status: "accepted" },
			);

			await expect(
				bookingService.acceptBooking({ bookingId: booking.id }),
			).rejects.toThrow("Booking is not in pending status");
		});
	});

	describe("declineBooking", () => {
		it("should decline pending booking with reason", async () => {
			const booking = await createTestBooking(
				testService.id,
				testUser.id,
				testProfessional.id,
			);

			const reason = "Schedule conflict";
			const result = await bookingService.declineBooking({
				bookingId: booking.id,
				reason,
			});

			expect(result.status).toBe("declined");
			expect(result.cancellationReason).toBe(reason);

			// Check service booking count was decremented
			const updatedService = await testDb.service.findUnique({
				where: { id: testService.id },
			});
			expect(updatedService?.bookingCount).toBe(0);

			// Check notification was created
			const notification = await testDb.notification.findFirst({
				where: {
					userId: testUser.id,
					type: "booking_declined",
				},
			});
			expect(notification).toBeDefined();
		});

		it("should update payment status to failed", async () => {
			const booking = await createTestBooking(
				testService.id,
				testUser.id,
				testProfessional.id,
			);

			// Create payment for the booking
			const payment = await testDb.payment.create({
				data: {
					bookingId: booking.id,
					amount: 10000,
					status: "pending",
					serviceFee: 1000,
					netAmount: 9000,
				},
			});

			await bookingService.declineBooking({ bookingId: booking.id });

			const updatedPayment = await testDb.payment.findUnique({
				where: { id: payment.id },
			});
			expect(updatedPayment?.status).toBe("failed");
		});
	});

	describe("getBookingById", () => {
		it("should return booking details for client", async () => {
			const booking = await createTestBooking(
				testService.id,
				testUser.id,
				testProfessional.id,
			);

			const result = await bookingService.getBooking({ bookingId: booking.id });

			expect(result.id).toBe(booking.id);
			expect(result.service).toBeDefined();
			expect(result.client).toBeDefined();
			expect(result.service.provider).toBeDefined();
		});

		it("should return booking details for provider", async () => {
			const booking = await createTestBooking(
				testService.id,
				testUser.id,
				testProfessional.id,
			);

			const result = await bookingService.getBooking({ bookingId: booking.id });

			expect(result.id).toBe(booking.id);
		});

		it("should reject access for unauthorized user", async () => {
			const booking = await createTestBooking(
				testService.id,
				testUser.id,
				testProfessional.id,
			);
			const otherUser = await createTestUser({ email: "other@example.com" });

			await expect(
				bookingService.getBooking({ bookingId: booking.id }),
			).rejects.toThrow("You don't have permission to view this booking");
		});
	});

	describe("updateBookingStatus", () => {
		it("should mark booking as completed by provider", async () => {
			const booking = await createTestBooking(
				testService.id,
				testUser.id,
				testProfessional.id,
				{ status: "accepted" },
			);

			// Create payment for the booking
			const payment = await testDb.payment.create({
				data: {
					bookingId: booking.id,
					amount: 10000,
					status: "pending",
					serviceFee: 1000,
					netAmount: 9000,
				},
			});

			const result = await bookingService.updateBookingStatus({
				bookingId: booking.id,
				status: "completed",
			});

			expect(result.status).toBe("completed");
			expect(result.completedAt).toBeInstanceOf(Date);

			// Check payment was updated to paid with escrow
			const updatedPayment = await testDb.payment.findUnique({
				where: { id: payment.id },
			});
			expect(updatedPayment?.status).toBe("paid");
			expect(updatedPayment?.escrowReleaseDate).toBeInstanceOf(Date);

			// Check notification was created for client
			const notification = await testDb.notification.findFirst({
				where: {
					userId: testUser.id,
					type: "service_completed",
				},
			});
			expect(notification).toBeDefined();
		});

		it("should reject completion by client", async () => {
			const booking = await createTestBooking(
				testService.id,
				testUser.id,
				testProfessional.id,
				{ status: "accepted" },
			);

			await expect(
				bookingService.updateBookingStatus({
					bookingId: booking.id,
					status: "completed",
				}),
			).rejects.toThrow(
				"Only the service provider can mark a booking as completed",
			);
		});

		it("should cancel booking with refund", async () => {
			const booking = await createTestBooking(
				testService.id,
				testUser.id,
				testProfessional.id,
				{ status: "accepted" },
			);

			const payment = await testDb.payment.create({
				data: {
					bookingId: booking.id,
					amount: 10000,
					status: "paid",
					serviceFee: 1000,
					netAmount: 9000,
				},
			});

			const result = await bookingService.updateBookingStatus({
				bookingId: booking.id,
				status: "cancelled",
				reason: "Change of plans",
			});

			expect(result.status).toBe("cancelled");
			expect(result.cancellationReason).toBe("Change of plans");

			// Check payment was refunded
			const updatedPayment = await testDb.payment.findUnique({
				where: { id: payment.id },
			});
			expect(updatedPayment?.status).toBe("refunded");
			expect(updatedPayment?.refundAmount).toBe(10000);
		});
	});

	describe("listBookings", () => {
		it("should list client bookings with pagination", async () => {
			// Create multiple bookings
			await Promise.all([
				createTestBooking(testService.id, testUser.id, testProfessional.id),
				createTestBooking(testService.id, testUser.id, testProfessional.id),
				createTestBooking(testService.id, testUser.id, testProfessional.id),
			]);

			const result = await bookingService.listBookings({
				role: "client",
				limit: 2,
			});

			expect(result.bookings).toHaveLength(2);
			expect(result.nextCursor).toBeDefined();
		});

		it("should list provider bookings", async () => {
			await createTestBooking(testService.id, testUser.id, testProfessional.id);

			const result = await bookingService.listBookings({
				role: "provider",
				limit: 20,
			});

			expect(result.bookings).toHaveLength(1);
			expect(result.bookings[0]?.providerId).toBe(testProfessional.id);
		});

		it("should filter bookings by status", async () => {
			await createTestBooking(
				testService.id,
				testUser.id,
				testProfessional.id,
				{
					status: "pending",
				},
			);
			await createTestBooking(
				testService.id,
				testUser.id,
				testProfessional.id,
				{
					status: "accepted",
				},
			);

			const pendingResult = await bookingService.listBookings({
				role: "client",
				status: "pending",
				limit: 20,
			});

			const acceptedResult = await bookingService.listBookings({
				role: "client",
				status: "accepted",
				limit: 20,
			});

			expect(pendingResult.bookings).toHaveLength(1);
			expect(pendingResult.bookings[0]?.status).toBe("pending");
			expect(acceptedResult.bookings).toHaveLength(1);
			expect(acceptedResult.bookings[0]?.status).toBe("accepted");
		});
	});
});
