import { TRPCError } from "@trpc/server";
import { beforeEach, describe, expect, it } from "vitest";
import { createBookingService } from "~/server/services/booking-service";
import {
	cleanupTestDatabase,
	setupTestDatabase,
	testDb,
	testService,
	testUsers,
} from "../setup";

describe("BookingService Integration Tests", () => {
	beforeEach(async () => {
		await cleanupTestDatabase();
		await setupTestDatabase();
	});

	describe("createBooking", () => {
		it("should successfully create a booking", async () => {
			const bookingService = createBookingService({
				db: testDb,
				currentUser: testUsers.client,
			});

			const bookingData = {
				serviceId: testService.id,
				bookingDate: new Date("2024-12-25T10:00:00Z"),
				notes: "Test booking notes",
				address: "Test booking address",
			};

			const result = await bookingService.createBooking(bookingData);

			expect(result.booking.serviceId).toBe(bookingData.serviceId);
			expect(result.booking.clientId).toBe(testUsers.client.id);
			expect(result.booking.providerId).toBe(testUsers.professional.id);
			expect(result.booking.totalPrice).toBe(testService.price);
			expect(result.booking.status).toBe("pending");
			expect(result.booking.notes).toBe(bookingData.notes);

			expect(result.payment.amount).toBe(testService.price);
			expect(result.payment.status).toBe("pending");
			expect(result.payment.serviceFee).toBe(testService.price * 0.1);
			expect(result.payment.netAmount).toBe(testService.price * 0.9);

			// Verify notification was created for provider
			const notification = await testDb.notification.findFirst({
				where: {
					userId: testUsers.professional.id,
					type: "new_booking",
				},
			});
			expect(notification).toBeTruthy();

			// Verify service booking count was incremented
			const updatedService = await testDb.service.findUnique({
				where: { id: testService.id },
			});
			expect(updatedService?.bookingCount).toBe(1);
		});

		it("should calculate hourly pricing correctly", async () => {
			// Update service to hourly pricing
			await testDb.service.update({
				where: { id: testService.id },
				data: { priceType: "hourly", price: 25.0 },
			});

			const bookingService = createBookingService({
				db: testDb,
				currentUser: testUsers.client,
			});

			const startDate = new Date("2024-12-25T10:00:00Z");
			const endDate = new Date("2024-12-25T12:00:00Z"); // 2 hours

			const bookingData = {
				serviceId: testService.id,
				bookingDate: startDate,
				endDate: endDate,
			};

			const result = await bookingService.createBooking(bookingData);

			expect(result.booking.totalPrice).toBe(50.0); // 25.0 * 2 hours
		});

		it("should prevent booking own service", async () => {
			const bookingService = createBookingService({
				db: testDb,
				currentUser: testUsers.professional,
			});

			const bookingData = {
				serviceId: testService.id,
				bookingDate: new Date("2024-12-25T10:00:00Z"),
			};

			await expect(bookingService.createBooking(bookingData)).rejects.toThrow(
				TRPCError,
			);
		});

		it("should prevent booking inactive service", async () => {
			// Make service inactive
			await testDb.service.update({
				where: { id: testService.id },
				data: { status: "inactive" },
			});

			const bookingService = createBookingService({
				db: testDb,
				currentUser: testUsers.client,
			});

			const bookingData = {
				serviceId: testService.id,
				bookingDate: new Date("2024-12-25T10:00:00Z"),
			};

			await expect(bookingService.createBooking(bookingData)).rejects.toThrow(
				TRPCError,
			);
		});

		it("should respect max bookings limit", async () => {
			// Set service max bookings to 1
			await testDb.service.update({
				where: { id: testService.id },
				data: { maxBookings: 1 },
			});

			// Create an additional client for the existing booking
			await testDb.user.create({
				data: {
					id: "other-client-id",
					name: "Other Client",
					email: "other@test.com",
					isProfessional: false,
					accountBalance: 0,
					cpf: null,
					phone: null,
					bio: null,
					address: null,
					city: null,
					state: null,
					zipCode: null,
					professionalSince: null,
					notificationEmail: true,
					notificationSms: false,
					notificationWhatsapp: false,
					image: null,
					emailVerified: null,
					createdAt: new Date(),
					updatedAt: new Date(),
				},
			});

			// Create first booking
			await testDb.booking.create({
				data: {
					id: "existing-booking-id",
					serviceId: testService.id,
					clientId: "other-client-id",
					providerId: testUsers.professional.id,
					bookingDate: new Date("2024-12-25T10:00:00Z"),
					totalPrice: 50.0,
					status: "pending",
					createdAt: new Date(),
					updatedAt: new Date(),
				},
			});

			const bookingService = createBookingService({
				db: testDb,
				currentUser: testUsers.client,
			});

			const bookingData = {
				serviceId: testService.id,
				bookingDate: new Date("2024-12-25T10:00:00Z"),
			};

			await expect(bookingService.createBooking(bookingData)).rejects.toThrow(
				TRPCError,
			);
		});
	});

	describe("acceptBooking", () => {
		let testBooking: Awaited<ReturnType<typeof testDb.booking.create>>;

		beforeEach(async () => {
			testBooking = await testDb.booking.create({
				data: {
					id: "test-booking-id",
					serviceId: testService.id,
					clientId: testUsers.client.id,
					providerId: testUsers.professional.id,
					bookingDate: new Date("2024-12-25T10:00:00Z"),
					totalPrice: 50.0,
					status: "pending",
					createdAt: new Date(),
					updatedAt: new Date(),
				},
			});
		});

		it("should successfully accept a booking", async () => {
			const bookingService = createBookingService({
				db: testDb,
				currentUser: testUsers.professional,
			});

			const result = await bookingService.acceptBooking({
				bookingId: testBooking.id,
			});

			expect(result.status).toBe("accepted");

			// Verify notification was created for client
			const notification = await testDb.notification.findFirst({
				where: {
					userId: testUsers.client.id,
					type: "booking_accepted",
				},
			});
			expect(notification).toBeTruthy();
		});

		it("should only allow provider to accept booking", async () => {
			const bookingService = createBookingService({
				db: testDb,
				currentUser: testUsers.client,
			});

			await expect(
				bookingService.acceptBooking({ bookingId: testBooking.id }),
			).rejects.toThrow(TRPCError);
		});

		it("should only accept pending bookings", async () => {
			// Update booking to accepted
			await testDb.booking.update({
				where: { id: testBooking.id },
				data: { status: "accepted" },
			});

			const bookingService = createBookingService({
				db: testDb,
				currentUser: testUsers.professional,
			});

			await expect(
				bookingService.acceptBooking({ bookingId: testBooking.id }),
			).rejects.toThrow(TRPCError);
		});
	});

	describe("declineBooking", () => {
		let testBooking: Awaited<ReturnType<typeof testDb.booking.create>>;

		beforeEach(async () => {
			// First increment the service booking count
			await testDb.service.update({
				where: { id: testService.id },
				data: { bookingCount: 1 },
			});

			testBooking = await testDb.booking.create({
				data: {
					id: "test-booking-id",
					serviceId: testService.id,
					clientId: testUsers.client.id,
					providerId: testUsers.professional.id,
					bookingDate: new Date("2024-12-25T10:00:00Z"),
					totalPrice: 50.0,
					status: "pending",
					createdAt: new Date(),
					updatedAt: new Date(),
				},
			});

			// Create associated payment
			await testDb.payment.create({
				data: {
					id: "test-payment-id",
					bookingId: testBooking.id,
					amount: 50.0,
					status: "pending",
					serviceFee: 5.0,
					netAmount: 45.0,
					createdAt: new Date(),
					updatedAt: new Date(),
				},
			});
		});

		it("should successfully decline a booking", async () => {
			const bookingService = createBookingService({
				db: testDb,
				currentUser: testUsers.professional,
			});

			const result = await bookingService.declineBooking({
				bookingId: testBooking.id,
				reason: "Schedule conflict",
			});

			expect(result.status).toBe("declined");
			expect(result.cancellationReason).toBe("Schedule conflict");
			expect(result.cancelledBy).toBe(testUsers.professional.id);

			// Verify payment was marked as failed
			const payment = await testDb.payment.findFirst({
				where: { bookingId: testBooking.id },
			});
			expect(payment?.status).toBe("failed");

			// Verify notification was created for client
			const notification = await testDb.notification.findFirst({
				where: {
					userId: testUsers.client.id,
					type: "booking_declined",
				},
			});
			expect(notification).toBeTruthy();

			// Verify service booking count was decremented
			const updatedService = await testDb.service.findUnique({
				where: { id: testService.id },
			});
			expect(updatedService?.bookingCount).toBe(0);
		});
	});

	describe("updateBookingStatus", () => {
		let testBooking: Awaited<ReturnType<typeof testDb.booking.create>>;
		let testPayment: Awaited<ReturnType<typeof testDb.payment.create>>;

		beforeEach(async () => {
			testBooking = await testDb.booking.create({
				data: {
					id: "test-booking-id",
					serviceId: testService.id,
					clientId: testUsers.client.id,
					providerId: testUsers.professional.id,
					bookingDate: new Date("2024-12-25T10:00:00Z"),
					totalPrice: 50.0,
					status: "accepted",
					createdAt: new Date(),
					updatedAt: new Date(),
				},
			});

			testPayment = await testDb.payment.create({
				data: {
					id: "test-payment-id",
					bookingId: testBooking.id,
					amount: 50.0,
					status: "pending",
					serviceFee: 5.0,
					netAmount: 45.0,
					createdAt: new Date(),
					updatedAt: new Date(),
				},
			});
		});

		it("should mark booking as completed (provider only)", async () => {
			const bookingService = createBookingService({
				db: testDb,
				currentUser: testUsers.professional,
			});

			const result = await bookingService.updateBookingStatus({
				bookingId: testBooking.id,
				status: "completed",
			});

			expect(result.status).toBe("completed");
			expect(result.completedAt).toBeTruthy();

			// Verify payment was updated with escrow
			const updatedPayment = await testDb.payment.findFirst({
				where: { id: testPayment.id },
			});
			expect(updatedPayment?.status).toBe("paid");
			expect(updatedPayment?.escrowReleaseDate).toBeTruthy();

			// Verify notification for client to review
			const notification = await testDb.notification.findFirst({
				where: {
					userId: testUsers.client.id,
					type: "service_completed",
				},
			});
			expect(notification).toBeTruthy();
		});

		it("should only allow provider to mark as completed", async () => {
			const bookingService = createBookingService({
				db: testDb,
				currentUser: testUsers.client,
			});

			await expect(
				bookingService.updateBookingStatus({
					bookingId: testBooking.id,
					status: "completed",
				}),
			).rejects.toThrow(TRPCError);
		});

		it("should allow cancellation by either party", async () => {
			const bookingService = createBookingService({
				db: testDb,
				currentUser: testUsers.client,
			});

			const result = await bookingService.updateBookingStatus({
				bookingId: testBooking.id,
				status: "cancelled",
				reason: "Changed my mind",
			});

			expect(result.status).toBe("cancelled");
			expect(result.cancellationReason).toBe("Changed my mind");
			expect(result.cancelledBy).toBe(testUsers.client.id);

			// Verify payment was refunded
			const updatedPayment = await testDb.payment.findFirst({
				where: { id: testPayment.id },
			});
			expect(updatedPayment?.status).toBe("refunded");
			expect(updatedPayment?.refundAmount).toBe(50.0);
			expect(updatedPayment?.refundedAt).toBeTruthy();
		});

		it("should only complete accepted bookings", async () => {
			// Update booking to pending
			await testDb.booking.update({
				where: { id: testBooking.id },
				data: { status: "pending" },
			});

			const bookingService = createBookingService({
				db: testDb,
				currentUser: testUsers.professional,
			});

			await expect(
				bookingService.updateBookingStatus({
					bookingId: testBooking.id,
					status: "completed",
				}),
			).rejects.toThrow(TRPCError);
		});
	});

	describe("listBookings", () => {
		beforeEach(async () => {
			// Create multiple test bookings
			await testDb.booking.createMany({
				data: [
					{
						id: "booking-1",
						serviceId: testService.id,
						clientId: testUsers.client.id,
						providerId: testUsers.professional.id,
						bookingDate: new Date("2024-12-25T10:00:00Z"),
						totalPrice: 50.0,
						status: "pending",
						createdAt: new Date("2024-12-01"),
						updatedAt: new Date("2024-12-01"),
					},
					{
						id: "booking-2",
						serviceId: testService.id,
						clientId: testUsers.client.id,
						providerId: testUsers.professional.id,
						bookingDate: new Date("2024-12-26T10:00:00Z"),
						totalPrice: 75.0,
						status: "accepted",
						createdAt: new Date("2024-12-02"),
						updatedAt: new Date("2024-12-02"),
					},
				],
			});
		});

		it("should list client bookings", async () => {
			const bookingService = createBookingService({
				db: testDb,
				currentUser: testUsers.client,
			});

			const result = await bookingService.listBookings({
				role: "client",
				limit: 10,
			});

			expect(result.bookings).toHaveLength(2);
			expect(result.bookings[0]?.clientId).toBe(testUsers.client.id);
			expect(result.bookings[1]?.clientId).toBe(testUsers.client.id);
		});

		it("should list provider bookings", async () => {
			const bookingService = createBookingService({
				db: testDb,
				currentUser: testUsers.professional,
			});

			const result = await bookingService.listBookings({
				role: "provider",
				limit: 10,
			});

			expect(result.bookings).toHaveLength(2);
			expect(result.bookings[0]?.providerId).toBe(testUsers.professional.id);
			expect(result.bookings[1]?.providerId).toBe(testUsers.professional.id);
		});

		it("should filter by status", async () => {
			const bookingService = createBookingService({
				db: testDb,
				currentUser: testUsers.client,
			});

			const result = await bookingService.listBookings({
				role: "client",
				status: "pending",
				limit: 10,
			});

			expect(result.bookings).toHaveLength(1);
			expect(result.bookings[0]?.status).toBe("pending");
		});

		it("should handle pagination", async () => {
			const bookingService = createBookingService({
				db: testDb,
				currentUser: testUsers.client,
			});

			const result = await bookingService.listBookings({
				role: "client",
				limit: 1,
			});

			expect(result.bookings).toHaveLength(1);
			expect(result.nextCursor).toBeTruthy();
		});
	});
});
