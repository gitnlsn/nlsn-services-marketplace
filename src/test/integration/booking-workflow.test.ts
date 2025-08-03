import { beforeEach, describe, expect, it, vi } from "vitest";
import { createBookingService } from "~/server/services/booking-service";
import { createServiceService } from "~/server/services/service-service";
import { createUserService } from "~/server/services/user-service";
import {
	createMockBooking,
	createMockCategory,
	createMockNotification,
	createMockPayment,
	createMockService,
	createMockUser,
	mockTransactionSuccess,
} from "../mock-helpers";
import { createMockPrismaClient } from "../setup";
import { type MockPrismaClient, asPrismaClient } from "../types";

describe("Complete Booking Workflow Unit Tests", () => {
	let mockDb: MockPrismaClient;
	let testProfessional: ReturnType<typeof createMockUser>;
	let testUser: ReturnType<typeof createMockUser>;
	let testCategory: ReturnType<typeof createMockCategory>;

	beforeEach(() => {
		vi.clearAllMocks();
		mockDb = createMockPrismaClient();
		mockTransactionSuccess(mockDb);

		// Create test data
		testProfessional = createMockUser({
			id: "professional-id",
			name: "Test Professional",
			email: "professional@test.com",
			isProfessional: true,
			professionalSince: new Date(),
			phone: "11999999999",
			bio: "Professional bio",
			address: "Test Address",
			city: "São Paulo",
			state: "SP",
			zipCode: "01234567",
		});

		testUser = createMockUser({
			id: "client-id",
			name: "Test Client",
			email: "client@test.com",
			isProfessional: false,
		});

		testCategory = createMockCategory({
			id: "category-id",
			name: "Test Category",
		});
	});

	describe("End-to-End Service Booking Flow", () => {
		it("should complete full booking lifecycle from creation to completion", async () => {
			// Step 1: Professional creates a service
			const serviceService = createServiceService({
				db: asPrismaClient(mockDb),
				currentUser: testProfessional,
			});

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

			const createdService = createMockService({
				...serviceData,
				id: "service-id",
				providerId: testProfessional.id,
				status: "active",
			});

			// Mock service creation
			mockDb.service.create.mockResolvedValue(createdService);
			mockDb.image.createMany.mockResolvedValue({ count: 1 });

			const service = await serviceService.createService(serviceData);

			expect(service.title).toBe(serviceData.title);
			expect(service.status).toBe("active");

			// Step 2: Client books the service
			const bookingService = createBookingService({
				db: asPrismaClient(mockDb),
				currentUser: testUser,
				currentUserId: testUser.id,
			});

			const bookingData = {
				serviceId: createdService.id,
				bookingDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
				notes: "Please focus on kitchen and living room",
				address: "Rua das Flores, 123 - São Paulo, SP",
			};

			// Mock service lookup for booking
			mockDb.service.findUnique.mockResolvedValue({
				...createdService,
				provider: testProfessional,
			});

			// Mock booking count check
			mockDb.booking.count.mockResolvedValue(0);

			const createdBooking = createMockBooking({
				id: "booking-id",
				serviceId: createdService.id,
				clientId: testUser.id,
				providerId: testProfessional.id,
				bookingDate: bookingData.bookingDate,
				totalPrice: 15000,
				status: "pending",
				notes: bookingData.notes,
				address: bookingData.address,
			});

			const createdPayment = createMockPayment({
				id: "payment-id",
				bookingId: createdBooking.id,
				amount: 15000,
				serviceFee: 1500, // 10% platform fee
				netAmount: 13500, // 90% for professional
			});

			mockDb.booking.create.mockResolvedValue(createdBooking);
			mockDb.payment.create.mockResolvedValue(createdPayment);
			mockDb.notification.create.mockResolvedValue(createMockNotification());
			mockDb.service.update.mockResolvedValue({
				...createdService,
				bookingCount: 1,
			});

			const { booking, payment } =
				await bookingService.createBooking(bookingData);

			expect(booking.status).toBe("pending");
			expect(payment.amount).toBe(15000);
			expect(payment.serviceFee).toBe(1500);
			expect(payment.netAmount).toBe(13500);

			// Verify service booking count was incremented
			expect(mockDb.service.update).toHaveBeenCalledWith({
				where: { id: createdService.id },
				data: { bookingCount: { increment: 1 } },
			});

			// Verify notification was created for professional
			expect(mockDb.notification.create).toHaveBeenCalledWith(
				expect.objectContaining({
					data: expect.objectContaining({
						userId: testProfessional.id,
						type: "new_booking",
					}),
				}),
			);

			// Step 3: Professional accepts the booking
			const professionalBookingService = createBookingService({
				db: asPrismaClient(mockDb),
				currentUser: testProfessional,
				currentUserId: testProfessional.id,
			});

			mockDb.booking.findUnique.mockResolvedValue(createdBooking);
			const acceptedBooking = {
				...createdBooking,
				status: "accepted" as const,
			};
			mockDb.booking.update.mockResolvedValue(acceptedBooking);
			mockDb.notification.create.mockResolvedValue(createMockNotification());

			const accepted = await professionalBookingService.acceptBooking({
				bookingId: booking.id,
			});

			expect(accepted.status).toBe("accepted");

			// Verify notification was created for client
			expect(mockDb.notification.create).toHaveBeenCalledWith(
				expect.objectContaining({
					data: expect.objectContaining({
						userId: testUser.id,
						type: "booking_accepted",
					}),
				}),
			);

			// Step 4: Professional marks service as completed
			mockDb.booking.findUnique.mockResolvedValue(acceptedBooking);
			const completedBooking = {
				...acceptedBooking,
				status: "completed" as const,
				completedAt: new Date(),
			};
			mockDb.booking.update.mockResolvedValue(completedBooking);
			mockDb.payment.updateMany.mockResolvedValue({ count: 1 });
			mockDb.notification.create.mockResolvedValue(createMockNotification());

			const completed = await professionalBookingService.updateBookingStatus({
				bookingId: booking.id,
				status: "completed",
			});

			expect(completed.status).toBe("completed");
			expect(completed.completedAt).toBeInstanceOf(Date);

			// Verify payment was moved to escrow
			expect(mockDb.payment.updateMany).toHaveBeenCalledWith({
				where: { bookingId: booking.id },
				data: expect.objectContaining({
					status: "paid",
					escrowReleaseDate: expect.any(Date),
				}),
			});

			// Verify notification was created for client to review
			expect(mockDb.notification.create).toHaveBeenCalledWith(
				expect.objectContaining({
					data: expect.objectContaining({
						userId: testUser.id,
						type: "service_completed",
					}),
				}),
			);

			// Step 5: Verify service statistics
			const mockStats = {
				bookings: {
					total: 1,
					byStatus: {
						pending: 0,
						accepted: 0,
						completed: 1,
						cancelled: 0,
						declined: 0,
					},
				},
				revenue: {
					total: 15000,
					thisMonth: 15000,
					lastMonth: 0,
				},
				reviews: {
					count: 0,
					average: 0,
				},
				viewCount: 0,
			};

			// Mock aggregation queries
			mockDb.booking.count.mockResolvedValue(1);
			mockDb.booking.findMany.mockResolvedValue([completedBooking]);
			mockDb.payment.aggregate.mockResolvedValue({
				_sum: { netAmount: 13500 },
				_count: 1,
				_avg: null,
				_min: null,
				_max: null,
			});
			mockDb.review.aggregate.mockResolvedValue({
				_avg: { rating: 0 },
				_count: 0,
				_sum: null,
				_min: null,
				_max: null,
			});

			const serviceStats = await serviceService.getServiceStats({
				serviceId: createdService.id,
			});

			expect(serviceStats.bookings.total).toBe(1);
			expect(serviceStats.bookings.byStatus.completed).toBe(1);
		});

		it("should handle booking cancellation with refund", async () => {
			const serviceService = createServiceService({
				db: asPrismaClient(mockDb),
				currentUser: testProfessional,
			});

			const service = createMockService({
				id: "cancel-service-id",
				title: "Cancellation Test Service",
				description: "Service for testing cancellation",
				price: 10000,
				priceType: "fixed",
				categoryId: testCategory.id,
				providerId: testProfessional.id,
			});

			mockDb.service.create.mockResolvedValue(service);

			const createdService = await serviceService.createService({
				title: service.title,
				description: service.description,
				price: service.price,
				priceType: service.priceType,
				categoryId: service.categoryId,
			});

			// Client books the service
			const bookingService = createBookingService({
				db: asPrismaClient(mockDb),
				currentUser: testUser,
				currentUserId: testUser.id,
			});

			mockDb.service.findUnique.mockResolvedValue({
				...service,
				provider: testProfessional,
			});
			mockDb.booking.count.mockResolvedValue(0);

			const booking = createMockBooking({
				id: "cancel-booking-id",
				serviceId: service.id,
				clientId: testUser.id,
				providerId: testProfessional.id,
				totalPrice: 10000,
			});

			const payment = createMockPayment({
				bookingId: booking.id,
				amount: 10000,
			});

			mockDb.booking.create.mockResolvedValue(booking);
			mockDb.payment.create.mockResolvedValue(payment);
			mockDb.notification.create.mockResolvedValue(createMockNotification());
			mockDb.service.update.mockResolvedValue(service);

			const { booking: createdBooking } = await bookingService.createBooking({
				serviceId: service.id,
				bookingDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
			});

			// Accept the booking
			const professionalBookingService = createBookingService({
				db: asPrismaClient(mockDb),
				currentUser: testProfessional,
				currentUserId: testProfessional.id,
			});

			mockDb.booking.findUnique.mockResolvedValue(booking);
			const acceptedBooking = {
				...booking,
				status: "accepted" as const,
			};
			mockDb.booking.update.mockResolvedValue(acceptedBooking);

			await professionalBookingService.acceptBooking({
				bookingId: createdBooking.id,
			});

			// Client cancels the booking
			mockDb.booking.findUnique.mockResolvedValue(acceptedBooking);
			const cancelledBooking = {
				...acceptedBooking,
				status: "cancelled" as const,
				cancellationReason: "Unexpected emergency",
				cancelledBy: testUser.id,
			};
			mockDb.booking.update.mockResolvedValue(cancelledBooking);
			mockDb.payment.updateMany.mockResolvedValue({ count: 1 });

			const cancelled = await bookingService.updateBookingStatus({
				bookingId: createdBooking.id,
				status: "cancelled",
				reason: "Unexpected emergency",
			});

			expect(cancelled.status).toBe("cancelled");
			expect(cancelled.cancellationReason).toBe("Unexpected emergency");

			// Verify payment was refunded
			expect(mockDb.payment.updateMany).toHaveBeenCalledWith({
				where: { bookingId: createdBooking.id },
				data: expect.objectContaining({
					status: "refunded",
					refundAmount: 10000,
					refundedAt: expect.any(Date),
				}),
			});

			// Verify notification was created for professional
			expect(mockDb.notification.create).toHaveBeenCalledWith(
				expect.objectContaining({
					data: expect.objectContaining({
						userId: testProfessional.id,
						type: "booking_cancelled",
					}),
				}),
			);
		});

		it("should handle booking decline by professional", async () => {
			const serviceService = createServiceService({
				db: asPrismaClient(mockDb),
				currentUser: testProfessional,
			});

			const service = createMockService({
				id: "decline-service-id",
				title: "Decline Test Service",
				description: "Service for testing decline",
				price: 8000,
				priceType: "fixed",
				categoryId: testCategory.id,
				providerId: testProfessional.id,
			});

			mockDb.service.create.mockResolvedValue(service);

			await serviceService.createService({
				title: service.title,
				description: service.description,
				price: service.price,
				priceType: service.priceType,
				categoryId: service.categoryId,
			});

			// Client books the service
			const bookingService = createBookingService({
				db: asPrismaClient(mockDb),
				currentUser: testUser,
				currentUserId: testUser.id,
			});

			mockDb.service.findUnique.mockResolvedValue({
				...service,
				provider: testProfessional,
			});
			mockDb.booking.count.mockResolvedValue(0);

			const booking = createMockBooking({
				id: "decline-booking-id",
				serviceId: service.id,
				clientId: testUser.id,
				providerId: testProfessional.id,
				totalPrice: 8000,
			});

			const payment = createMockPayment({
				bookingId: booking.id,
				amount: 8000,
			});

			mockDb.booking.create.mockResolvedValue(booking);
			mockDb.payment.create.mockResolvedValue(payment);
			mockDb.notification.create.mockResolvedValue(createMockNotification());
			mockDb.service.update.mockResolvedValue(service);

			const { booking: createdBooking } = await bookingService.createBooking({
				serviceId: service.id,
				bookingDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
			});

			// Professional declines the booking
			const professionalBookingService = createBookingService({
				db: asPrismaClient(mockDb),
				currentUser: testProfessional,
				currentUserId: testProfessional.id,
			});

			mockDb.booking.findUnique.mockResolvedValue(booking);
			const declinedBooking = {
				...booking,
				status: "declined" as const,
				cancellationReason: "Schedule conflict with existing booking",
				cancelledBy: testProfessional.id,
			};
			mockDb.booking.update.mockResolvedValue(declinedBooking);
			mockDb.payment.updateMany.mockResolvedValue({ count: 1 });
			mockDb.service.update.mockResolvedValue({
				...service,
				bookingCount: 0,
			});

			const declined = await professionalBookingService.declineBooking({
				bookingId: createdBooking.id,
				reason: "Schedule conflict with existing booking",
			});

			expect(declined.status).toBe("declined");
			expect(declined.cancellationReason).toBe(
				"Schedule conflict with existing booking",
			);

			// Verify payment was marked as failed
			expect(mockDb.payment.updateMany).toHaveBeenCalledWith({
				where: { bookingId: createdBooking.id },
				data: { status: "failed" },
			});

			// Verify service booking count was decremented
			expect(mockDb.service.update).toHaveBeenCalledWith({
				where: { id: service.id },
				data: { bookingCount: { decrement: 1 } },
			});

			// Verify notification was created for client
			expect(mockDb.notification.create).toHaveBeenCalledWith(
				expect.objectContaining({
					data: expect.objectContaining({
						userId: testUser.id,
						type: "booking_declined",
					}),
				}),
			);
		});

		it("should enforce max bookings limit", async () => {
			const serviceService = createServiceService({
				db: asPrismaClient(mockDb),
				currentUser: testProfessional,
			});

			const limitedService = createMockService({
				id: "limited-service-id",
				title: "Limited Booking Service",
				description: "Service with max 1 booking per day",
				price: 5000,
				priceType: "fixed",
				categoryId: testCategory.id,
				providerId: testProfessional.id,
				maxBookings: 1,
			});

			mockDb.service.create.mockResolvedValue(limitedService);

			await serviceService.createService({
				title: limitedService.title,
				description: limitedService.description,
				price: limitedService.price,
				priceType: limitedService.priceType,
				categoryId: limitedService.categoryId,
				maxBookings: limitedService.maxBookings,
			});

			const bookingDate = new Date(Date.now() + 24 * 60 * 60 * 1000);

			// First booking should succeed
			const bookingService = createBookingService({
				db: asPrismaClient(mockDb),
				currentUser: testUser,
				currentUserId: testUser.id,
			});

			mockDb.service.findUnique.mockResolvedValue({
				...limitedService,
				provider: testProfessional,
			});
			mockDb.booking.count.mockResolvedValue(0);

			const firstBooking = createMockBooking({
				id: "first-booking-id",
				serviceId: limitedService.id,
				clientId: testUser.id,
				providerId: testProfessional.id,
				bookingDate,
			});

			mockDb.booking.create.mockResolvedValue(firstBooking);
			mockDb.payment.create.mockResolvedValue(createMockPayment());
			mockDb.notification.create.mockResolvedValue(createMockNotification());
			mockDb.service.update.mockResolvedValue(limitedService);

			const { booking } = await bookingService.createBooking({
				serviceId: limitedService.id,
				bookingDate,
			});

			expect(booking.status).toBe("pending");

			// Second booking for the same date should fail
			const secondUser = createMockUser({
				id: "second-user-id",
				email: "second@example.com",
			});

			const secondUserBookingService = createBookingService({
				db: asPrismaClient(mockDb),
				currentUser: secondUser,
				currentUserId: secondUser.id,
			});

			// Mock that there's already 1 booking for this date
			mockDb.booking.count.mockResolvedValue(1);

			await expect(
				secondUserBookingService.createBooking({
					serviceId: limitedService.id,
					bookingDate,
				}),
			).rejects.toThrow("Service is fully booked for this date");
		});

		it("should calculate hourly pricing correctly for multi-hour bookings", async () => {
			const serviceService = createServiceService({
				db: asPrismaClient(mockDb),
				currentUser: testProfessional,
			});

			const hourlyService = createMockService({
				id: "hourly-service-id",
				title: "Hourly Consultation Service",
				description: "Professional consultation charged by hour",
				price: 8000, // R$ 80.00 per hour
				priceType: "hourly",
				categoryId: testCategory.id,
				providerId: testProfessional.id,
			});

			mockDb.service.create.mockResolvedValue(hourlyService);

			await serviceService.createService({
				title: hourlyService.title,
				description: hourlyService.description,
				price: hourlyService.price,
				priceType: hourlyService.priceType,
				categoryId: hourlyService.categoryId,
			});

			const bookingService = createBookingService({
				db: asPrismaClient(mockDb),
				currentUser: testUser,
				currentUserId: testUser.id,
			});

			const startDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
			const endDate = new Date(startDate.getTime() + 2.5 * 60 * 60 * 1000); // 2.5 hours later

			mockDb.service.findUnique.mockResolvedValue({
				...hourlyService,
				provider: testProfessional,
			});
			mockDb.booking.count.mockResolvedValue(0);

			const hourlyBooking = createMockBooking({
				id: "hourly-booking-id",
				serviceId: hourlyService.id,
				clientId: testUser.id,
				providerId: testProfessional.id,
				bookingDate: startDate,
				endDate,
				totalPrice: 24000, // 3 hours * R$ 80 = R$ 240
			});

			const hourlyPayment = createMockPayment({
				bookingId: hourlyBooking.id,
				amount: 24000,
				serviceFee: 2400, // 10% platform fee
				netAmount: 21600, // 90% for professional
			});

			mockDb.booking.create.mockResolvedValue(hourlyBooking);
			mockDb.payment.create.mockResolvedValue(hourlyPayment);
			mockDb.notification.create.mockResolvedValue(createMockNotification());
			mockDb.service.update.mockResolvedValue(hourlyService);

			const { booking, payment } = await bookingService.createBooking({
				serviceId: hourlyService.id,
				bookingDate: startDate,
				endDate,
			});

			// Should charge for 3 hours (rounded up from 2.5)
			expect(booking.totalPrice).toBe(24000);
			expect(payment.amount).toBe(24000);
			expect(payment.serviceFee).toBe(2400);
			expect(payment.netAmount).toBe(21600);
		});
	});

	describe("User Journey Integration", () => {
		it("should handle user becoming professional and creating services", async () => {
			// Start with regular user
			const regularUser = createMockUser({
				id: "regular-user-id",
				email: "future-pro@example.com",
				isProfessional: false,
			});

			expect(regularUser.isProfessional).toBe(false);

			// User becomes professional
			const professionalData = {
				phone: "11987654321",
				bio: "Experienced professional with 10+ years in the field providing excellent service",
				address: "Rua Profissional, 456",
				city: "São Paulo",
				state: "SP",
				zipCode: "04567890",
			};

			const userService = createUserService({
				db: asPrismaClient(mockDb),
				currentUser: regularUser,
			});

			// Mock user updates
			const updatedUser = {
				...regularUser,
				...professionalData,
			};
			mockDb.user.update.mockResolvedValueOnce(updatedUser);

			// Update profile with professional data first
			await userService.updateProfile(professionalData);

			// Then become professional
			const professionalUser = {
				...updatedUser,
				isProfessional: true,
				professionalSince: new Date(),
			};
			mockDb.user.update.mockResolvedValueOnce(professionalUser);

			const professional = await userService.becomeProfessional();

			expect(professional.isProfessional).toBe(true);
			expect(professional.professionalSince).toBeInstanceOf(Date);

			// Professional creates their first service
			const professionalServiceService = createServiceService({
				db: asPrismaClient(mockDb),
				currentUser: professionalUser,
			});

			const firstService = createMockService({
				id: "first-service-id",
				title: "New Professional Service",
				description: "My first service as a professional",
				price: 12000,
				priceType: "fixed",
				categoryId: testCategory.id,
				providerId: professionalUser.id,
				duration: 120,
			});

			mockDb.service.create.mockResolvedValue(firstService);

			const createdService = await professionalServiceService.createService({
				title: firstService.title,
				description: firstService.description,
				price: firstService.price,
				priceType: firstService.priceType,
				categoryId: firstService.categoryId,
				duration: firstService.duration,
			});

			expect(createdService.providerId).toBe(professionalUser.id);
			expect(createdService.status).toBe("active");

			// List professional's services
			mockDb.service.findMany.mockResolvedValue([firstService]);

			const myServices = await professionalServiceService.listMyServices({
				status: "all",
				limit: 20,
			});

			expect(myServices.services).toHaveLength(1);
			expect(myServices.services[0]?.title).toBe("New Professional Service");
		});

		it("should handle service updates and status changes", async () => {
			const serviceService = createServiceService({
				db: asPrismaClient(mockDb),
				currentUser: testProfessional,
			});

			const service = createMockService({
				id: "update-service-id",
				title: "Original Service Title",
				description: "Original description",
				price: 10000,
				priceType: "fixed",
				categoryId: testCategory.id,
				providerId: testProfessional.id,
			});

			mockDb.service.create.mockResolvedValue(service);

			await serviceService.createService({
				title: service.title,
				description: service.description,
				price: service.price,
				priceType: service.priceType,
				categoryId: service.categoryId,
			});

			// Update service details
			mockDb.service.findUnique.mockResolvedValue(service);
			const updatedService = {
				...service,
				title: "Updated Service Title",
				price: 15000,
				description: "Updated description with more details",
			};
			mockDb.service.update.mockResolvedValue(updatedService);

			const updated = await serviceService.updateService({
				serviceId: service.id,
				title: updatedService.title,
				price: updatedService.price,
				description: updatedService.description,
			});

			expect(updated.title).toBe("Updated Service Title");
			expect(updated.price).toBe(15000);

			// Change service status to inactive
			mockDb.service.findUnique.mockResolvedValue(updatedService);
			const inactiveService = {
				...updatedService,
				status: "inactive" as const,
			};
			mockDb.service.update.mockResolvedValue(inactiveService);

			const inactive = await serviceService.updateServiceStatus({
				serviceId: service.id,
				status: "inactive",
			});

			expect(inactive.status).toBe("inactive");

			// Verify clients can't book inactive service
			const bookingService = createBookingService({
				db: asPrismaClient(mockDb),
				currentUser: testUser,
				currentUserId: testUser.id,
			});

			mockDb.service.findUnique.mockResolvedValue({
				...inactiveService,
				provider: testProfessional,
			});

			await expect(
				bookingService.createBooking({
					serviceId: service.id,
					bookingDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
				}),
			).rejects.toThrow("Service is not available for booking");

			// Reactivate service
			mockDb.service.findUnique.mockResolvedValue(inactiveService);
			const activeService = {
				...inactiveService,
				status: "active" as const,
			};
			mockDb.service.update.mockResolvedValue(activeService);

			const active = await serviceService.updateServiceStatus({
				serviceId: service.id,
				status: "active",
			});

			expect(active.status).toBe("active");

			// Now booking should work
			mockDb.service.findUnique.mockResolvedValue({
				...activeService,
				provider: testProfessional,
			});
			mockDb.booking.count.mockResolvedValue(0);

			const newBooking = createMockBooking({
				serviceId: service.id,
				clientId: testUser.id,
				providerId: testProfessional.id,
			});

			mockDb.booking.create.mockResolvedValue(newBooking);
			mockDb.payment.create.mockResolvedValue(createMockPayment());
			mockDb.notification.create.mockResolvedValue(createMockNotification());
			mockDb.service.update.mockResolvedValue(activeService);

			const { booking } = await bookingService.createBooking({
				serviceId: service.id,
				bookingDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
			});

			expect(booking.status).toBe("pending");
		});
	});
});
