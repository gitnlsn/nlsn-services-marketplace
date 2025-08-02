import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { BookingService } from "~/server/services/booking.service";
import { ServiceService } from "~/server/services/service.service";
import { UserService } from "~/server/services/user.service";
import {
	createTestCategory,
	createTestProfessional,
	createTestUser,
	setupTestDatabase,
	teardownTestDatabase,
	testDb,
} from "../helpers/database";

describe("Complete Booking Workflow Integration Tests", () => {
	setupTestDatabase();

	let userService: UserService;
	let serviceService: ServiceService;
	let bookingService: BookingService;
	let testProfessional: Awaited<ReturnType<typeof createTestProfessional>>;
	let testUser: Awaited<ReturnType<typeof createTestUser>>;
	let testCategory: Awaited<ReturnType<typeof createTestCategory>>;

	beforeAll(async () => {
		userService = new UserService(testDb);
		serviceService = new ServiceService(testDb);
		bookingService = new BookingService(testDb);
		testProfessional = await createTestProfessional();
		testUser = await createTestUser();
		testCategory = await createTestCategory();
	});

	afterAll(async () => {
		await teardownTestDatabase();
	});

	describe("End-to-End Service Booking Flow", () => {
		it("should complete full booking lifecycle from creation to completion", async () => {
			// Step 1: Professional creates a service
			const serviceData = {
				title: "Home Cleaning Service",
				description: "Professional home cleaning with high quality standards",
				price: 15000, // R$ 150.00
				priceType: "fixed" as const,
				categoryId: testCategory.id,
				duration: 180, // 3 hours
				location: "São Paulo, SP",
				maxBookings: 3,
				images: ["https://example.com/cleaning1.jpg"],
			};

			const createdService = await serviceService.createService(
				testProfessional.id,
				serviceData,
			);

			expect(createdService.title).toBe(serviceData.title);
			expect(createdService.status).toBe("active");

			// Step 2: Client books the service
			const bookingData = {
				serviceId: createdService.id,
				bookingDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
				notes: "Please focus on kitchen and living room",
				address: "Rua das Flores, 123 - São Paulo, SP",
			};

			const { booking, payment } = await bookingService.createBooking(
				testUser.id,
				bookingData,
			);

			expect(booking.status).toBe("pending");
			expect(payment.amount).toBe(15000);
			expect(payment.serviceFee).toBe(1500); // 10% platform fee
			expect(payment.netAmount).toBe(13500); // 90% for professional

			// Verify service booking count was incremented
			const serviceAfterBooking = await testDb.service.findUnique({
				where: { id: createdService.id },
			});
			expect(serviceAfterBooking?.bookingCount).toBe(1);

			// Verify notification was created for professional
			const newBookingNotification = await testDb.notification.findFirst({
				where: {
					userId: testProfessional.id,
					type: "new_booking",
				},
			});
			expect(newBookingNotification).toBeDefined();

			// Step 3: Professional accepts the booking
			const acceptedBooking = await bookingService.acceptBooking(
				testProfessional.id,
				booking.id,
			);

			expect(acceptedBooking.status).toBe("accepted");

			// Verify notification was created for client
			const acceptedNotification = await testDb.notification.findFirst({
				where: {
					userId: testUser.id,
					type: "booking_accepted",
				},
			});
			expect(acceptedNotification).toBeDefined();

			// Step 4: Professional marks service as completed
			const completedBooking = await bookingService.updateBookingStatus(
				testProfessional.id,
				{
					bookingId: booking.id,
					status: "completed",
				},
			);

			expect(completedBooking.status).toBe("completed");
			expect(completedBooking.completedAt).toBeInstanceOf(Date);

			// Verify payment was moved to escrow
			const paymentAfterCompletion = await testDb.payment.findUnique({
				where: { id: payment.id },
			});
			expect(paymentAfterCompletion?.status).toBe("paid");
			expect(paymentAfterCompletion?.escrowReleaseDate).toBeInstanceOf(Date);

			// Verify notification was created for client to review
			const completedNotification = await testDb.notification.findFirst({
				where: {
					userId: testUser.id,
					type: "service_completed",
				},
			});
			expect(completedNotification).toBeDefined();

			// Step 5: Verify service statistics
			const serviceStats = await serviceService.getServiceStats(
				testProfessional.id,
				createdService.id,
			);

			expect(serviceStats.bookings.total).toBe(1);
			expect(serviceStats.bookings.byStatus.completed).toBe(1);
		});

		it("should handle booking cancellation with refund", async () => {
			// Create service and booking
			const service = await serviceService.createService(testProfessional.id, {
				title: "Cancellation Test Service",
				description: "Service for testing cancellation",
				price: 10000,
				priceType: "fixed" as const,
				categoryId: testCategory.id,
			});

			const { booking, payment } = await bookingService.createBooking(
				testUser.id,
				{
					serviceId: service.id,
					bookingDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
				},
			);

			// Accept the booking
			await bookingService.acceptBooking(testProfessional.id, booking.id);

			// Client cancels the booking
			const cancelledBooking = await bookingService.updateBookingStatus(
				testUser.id,
				{
					bookingId: booking.id,
					status: "cancelled",
					reason: "Unexpected emergency",
				},
			);

			expect(cancelledBooking.status).toBe("cancelled");
			expect(cancelledBooking.cancellationReason).toBe("Unexpected emergency");

			// Verify payment was refunded
			const refundedPayment = await testDb.payment.findUnique({
				where: { id: payment.id },
			});
			expect(refundedPayment?.status).toBe("refunded");
			expect(refundedPayment?.refundAmount).toBe(10000);

			// Verify notification was created for professional
			const cancelNotification = await testDb.notification.findFirst({
				where: {
					userId: testProfessional.id,
					type: "booking_cancelled",
				},
			});
			expect(cancelNotification).toBeDefined();
		});

		it("should handle booking decline by professional", async () => {
			// Create service and booking
			const service = await serviceService.createService(testProfessional.id, {
				title: "Decline Test Service",
				description: "Service for testing decline",
				price: 8000,
				priceType: "fixed" as const,
				categoryId: testCategory.id,
			});

			const { booking, payment } = await bookingService.createBooking(
				testUser.id,
				{
					serviceId: service.id,
					bookingDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
				},
			);

			// Professional declines the booking
			const declinedBooking = await bookingService.declineBooking(
				testProfessional.id,
				booking.id,
				"Schedule conflict with existing booking",
			);

			expect(declinedBooking.status).toBe("declined");
			expect(declinedBooking.cancellationReason).toBe(
				"Schedule conflict with existing booking",
			);

			// Verify payment was marked as failed
			const failedPayment = await testDb.payment.findUnique({
				where: { id: payment.id },
			});
			expect(failedPayment?.status).toBe("failed");

			// Verify service booking count was decremented
			const serviceAfterDecline = await testDb.service.findUnique({
				where: { id: service.id },
			});
			expect(serviceAfterDecline?.bookingCount).toBe(0);

			// Verify notification was created for client
			const declineNotification = await testDb.notification.findFirst({
				where: {
					userId: testUser.id,
					type: "booking_declined",
				},
			});
			expect(declineNotification).toBeDefined();
		});

		it("should enforce max bookings limit", async () => {
			// Create service with max bookings = 1
			const limitedService = await serviceService.createService(
				testProfessional.id,
				{
					title: "Limited Booking Service",
					description: "Service with max 1 booking per day",
					price: 5000,
					priceType: "fixed" as const,
					categoryId: testCategory.id,
					maxBookings: 1,
				},
			);

			const bookingDate = new Date(Date.now() + 24 * 60 * 60 * 1000);

			// First booking should succeed
			const { booking: firstBooking } = await bookingService.createBooking(
				testUser.id,
				{
					serviceId: limitedService.id,
					bookingDate,
				},
			);

			expect(firstBooking.status).toBe("pending");

			// Second booking for the same date should fail
			const secondUser = await createTestUser({ email: "second@example.com" });

			await expect(
				bookingService.createBooking(secondUser.id, {
					serviceId: limitedService.id,
					bookingDate,
				}),
			).rejects.toThrow("Service is fully booked for this date");
		});

		it("should calculate hourly pricing correctly for multi-hour bookings", async () => {
			// Create hourly service
			const hourlyService = await serviceService.createService(
				testProfessional.id,
				{
					title: "Hourly Consultation Service",
					description: "Professional consultation charged by hour",
					price: 8000, // R$ 80.00 per hour
					priceType: "hourly" as const,
					categoryId: testCategory.id,
				},
			);

			const startDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
			const endDate = new Date(startDate.getTime() + 2.5 * 60 * 60 * 1000); // 2.5 hours later

			const { booking, payment } = await bookingService.createBooking(
				testUser.id,
				{
					serviceId: hourlyService.id,
					bookingDate: startDate,
					endDate,
				},
			);

			// Should charge for 3 hours (rounded up from 2.5)
			expect(booking.totalPrice).toBe(24000); // 3 hours * R$ 80 = R$ 240
			expect(payment.amount).toBe(24000);
			expect(payment.serviceFee).toBe(2400); // 10% platform fee
			expect(payment.netAmount).toBe(21600); // 90% for professional
		});
	});

	describe("User Journey Integration", () => {
		it("should handle user becoming professional and creating services", async () => {
			// Start with regular user
			const regularUser = await createTestUser({
				email: "future-pro@example.com",
			});

			expect(regularUser.isProfessional).toBe(false);

			// User becomes professional
			const professionalData = {
				cpf: "11122233344",
				phone: "11987654321",
				bio: "Experienced professional with 10+ years in the field providing excellent service",
				address: "Rua Profissional, 456",
				city: "São Paulo",
				state: "SP",
				zipCode: "04567890",
				acceptTerms: true,
			};

			const professionalUser = await userService.becomeProfessional(
				regularUser.id,
				professionalData,
			);

			expect(professionalUser.isProfessional).toBe(true);
			expect(professionalUser.professionalSince).toBeInstanceOf(Date);

			// Professional creates their first service
			const firstService = await serviceService.createService(
				professionalUser.id,
				{
					title: "New Professional Service",
					description: "My first service as a professional",
					price: 12000,
					priceType: "fixed" as const,
					categoryId: testCategory.id,
					duration: 120,
				},
			);

			expect(firstService.providerId).toBe(professionalUser.id);
			expect(firstService.status).toBe("active");

			// List professional's services
			const myServices = await serviceService.listMyServices(
				professionalUser.id,
				{ status: "all" },
			);

			expect(myServices.services).toHaveLength(1);
			expect(myServices.services[0]?.title).toBe("New Professional Service");
		});

		it("should handle service updates and status changes", async () => {
			// Create service
			const service = await serviceService.createService(testProfessional.id, {
				title: "Original Service Title",
				description: "Original description",
				price: 10000,
				priceType: "fixed" as const,
				categoryId: testCategory.id,
			});

			// Update service details
			const updatedService = await serviceService.updateService(
				testProfessional.id,
				{
					serviceId: service.id,
					title: "Updated Service Title",
					price: 15000,
					description: "Updated description with more details",
				},
			);

			expect(updatedService.title).toBe("Updated Service Title");
			expect(updatedService.price).toBe(15000);

			// Change service status to inactive
			const inactiveService = await serviceService.updateServiceStatus(
				testProfessional.id,
				service.id,
				"inactive",
			);

			expect(inactiveService.status).toBe("inactive");

			// Verify clients can't book inactive service
			await expect(
				bookingService.createBooking(testUser.id, {
					serviceId: service.id,
					bookingDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
				}),
			).rejects.toThrow("Service is not available for booking");

			// Reactivate service
			const activeService = await serviceService.updateServiceStatus(
				testProfessional.id,
				service.id,
				"active",
			);

			expect(activeService.status).toBe("active");

			// Now booking should work
			const { booking } = await bookingService.createBooking(testUser.id, {
				serviceId: service.id,
				bookingDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
			});

			expect(booking.status).toBe("pending");
		});
	});
});
