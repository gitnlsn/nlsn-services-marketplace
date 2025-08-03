import { TRPCError } from "@trpc/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createBookingService } from "~/server/services/booking-service";
import { createMockPrismaClient, testService, testUsers } from "../setup";
import { type MockPrismaClient, asPrismaClient } from "../types";

describe("BookingService Unit Tests", () => {
	let mockDb: MockPrismaClient;

	beforeEach(() => {
		vi.clearAllMocks();
		mockDb = createMockPrismaClient();
	});

	describe("createBooking", () => {
		it("should successfully create a booking", async () => {
			const bookingService = createBookingService({
				db: asPrismaClient(mockDb),
				currentUser: testUsers.client,
				currentUserId: testUsers.client.id,
			});

			const bookingData = {
				serviceId: testService.id,
				bookingDate: new Date("2024-12-25T10:00:00Z"),
				notes: "Test booking notes",
				address: "Test booking address",
			};

			// Mock service lookup
			mockDb.service.findUnique.mockResolvedValue({
				...testService,
				provider: testUsers.professional,
			});

			// Mock booking count check
			mockDb.booking.count.mockResolvedValue(0);

			// Mock booking creation
			const createdBooking = {
				id: "new-booking-id",
				serviceId: bookingData.serviceId,
				clientId: testUsers.client.id,
				providerId: testUsers.professional.id,
				bookingDate: bookingData.bookingDate,
				endDate: null,
				totalPrice: testService.price,
				status: "pending",
				notes: bookingData.notes,
				address: bookingData.address,
				cancellationReason: null,
				cancelledBy: null,
				completedAt: null,
				createdAt: new Date(),
				updatedAt: new Date(),
			};
			mockDb.booking.create.mockResolvedValue(createdBooking);

			// Mock payment creation
			const createdPayment = {
				id: "new-payment-id",
				bookingId: createdBooking.id,
				amount: testService.price,
				status: "pending",
				serviceFee: testService.price * 0.1,
				netAmount: testService.price * 0.9,
				externalPaymentId: null,
				refundAmount: null,
				refundedAt: null,
				escrowReleaseDate: null,
				createdAt: new Date(),
				updatedAt: new Date(),
			};
			mockDb.payment.create.mockResolvedValue(createdPayment);

			// Mock notification creation
			mockDb.notification.create.mockResolvedValue({
				id: "new-notification-id",
				userId: testUsers.professional.id,
				type: "new_booking",
				title: "Nova Reserva",
				message: `${testUsers.client.name} solicitou uma reserva para ${testService.title}`,
				read: false,
				data: { bookingId: createdBooking.id },
				createdAt: new Date(),
			});

			// Mock service update for booking count
			mockDb.service.update.mockResolvedValue({
				...testService,
				bookingCount: 1,
			});

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

			// Verify service was looked up
			expect(mockDb.service.findUnique).toHaveBeenCalledWith({
				where: { id: testService.id },
				include: { provider: true },
			});

			// Verify notification was created
			expect(mockDb.notification.create).toHaveBeenCalled();

			// Verify service booking count was incremented
			expect(mockDb.service.update).toHaveBeenCalledWith({
				where: { id: testService.id },
				data: { bookingCount: { increment: 1 } },
			});
		});

		it("should calculate hourly pricing correctly", async () => {
			const hourlyService = {
				...testService,
				priceType: "hourly" as const,
				price: 25.0,
			};

			mockDb.service.findUnique.mockResolvedValue({
				...hourlyService,
				provider: testUsers.professional,
			});

			mockDb.booking.count.mockResolvedValue(0);

			const bookingService = createBookingService({
				db: asPrismaClient(mockDb),
				currentUser: testUsers.client,
				currentUserId: testUsers.client.id,
			});

			const startDate = new Date("2024-12-25T10:00:00Z");
			const endDate = new Date("2024-12-25T12:00:00Z"); // 2 hours

			const bookingData = {
				serviceId: hourlyService.id,
				bookingDate: startDate,
				endDate: endDate,
			};

			const createdBooking = {
				id: "hourly-booking-id",
				serviceId: bookingData.serviceId,
				clientId: testUsers.client.id,
				providerId: testUsers.professional.id,
				bookingDate: startDate,
				endDate: endDate,
				totalPrice: 50.0, // 25.0 * 2 hours
				status: "pending",
				notes: null,
				address: null,
				cancellationReason: null,
				cancelledBy: null,
				completedAt: null,
				createdAt: new Date(),
				updatedAt: new Date(),
			};
			mockDb.booking.create.mockResolvedValue(createdBooking);

			const createdPayment = {
				id: "hourly-payment-id",
				bookingId: createdBooking.id,
				amount: 50.0,
				status: "pending",
				serviceFee: 5.0,
				netAmount: 45.0,
				externalPaymentId: null,
				refundAmount: null,
				refundedAt: null,
				escrowReleaseDate: null,
				createdAt: new Date(),
				updatedAt: new Date(),
			};
			mockDb.payment.create.mockResolvedValue(createdPayment);

			mockDb.notification.create.mockResolvedValue({
				id: "notification-id",
				userId: "user-id",
				type: "new_booking",
				title: "Notification",
				message: "Test notification",
				read: false,
				data: null,
				createdAt: new Date(),
			});
			mockDb.service.update.mockResolvedValue({
				...hourlyService,
				bookingCount: 1,
			});

			const result = await bookingService.createBooking(bookingData);

			expect(result.booking.totalPrice).toBe(50.0); // 25.0 * 2 hours
		});

		it("should prevent booking own service", async () => {
			const bookingService = createBookingService({
				db: asPrismaClient(mockDb),
				currentUser: testUsers.professional,
				currentUserId: testUsers.professional.id,
			});

			mockDb.service.findUnique.mockResolvedValue({
				...testService,
				provider: testUsers.professional,
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
			const inactiveService = {
				...testService,
				status: "inactive" as const,
			};

			mockDb.service.findUnique.mockResolvedValue({
				...inactiveService,
				provider: testUsers.professional,
			});

			const bookingService = createBookingService({
				db: asPrismaClient(mockDb),
				currentUser: testUsers.client,
				currentUserId: testUsers.client.id,
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
			const limitedService = {
				...testService,
				maxBookings: 1,
			};

			mockDb.service.findUnique.mockResolvedValue({
				...limitedService,
				provider: testUsers.professional,
			});

			// Mock that there's already 1 booking for this date
			mockDb.booking.count.mockResolvedValue(1);

			const bookingService = createBookingService({
				db: asPrismaClient(mockDb),
				currentUser: testUsers.client,
				currentUserId: testUsers.client.id,
			});

			const bookingData = {
				serviceId: limitedService.id,
				bookingDate: new Date("2024-12-25T10:00:00Z"),
			};

			await expect(bookingService.createBooking(bookingData)).rejects.toThrow(
				TRPCError,
			);
		});
	});

	describe("acceptBooking", () => {
		const testBooking = {
			id: "test-booking-id",
			serviceId: testService.id,
			clientId: testUsers.client.id,
			providerId: testUsers.professional.id,
			bookingDate: new Date("2024-12-25T10:00:00Z"),
			endDate: null,
			totalPrice: 50.0,
			status: "pending" as const,
			notes: null,
			address: null,
			cancellationReason: null,
			cancelledBy: null,
			completedAt: null,
			createdAt: new Date(),
			updatedAt: new Date(),
		};

		it("should successfully accept a booking", async () => {
			const bookingService = createBookingService({
				db: asPrismaClient(mockDb),
				currentUser: testUsers.professional,
				currentUserId: testUsers.professional.id,
			});

			const bookingWithService = {
				...testBooking,
				service: testService,
				client: testUsers.client,
			};
			mockDb.booking.findUnique.mockResolvedValue(bookingWithService);

			const acceptedBooking = {
				...testBooking,
				status: "accepted" as const,
			};
			mockDb.booking.update.mockResolvedValue(acceptedBooking);

			mockDb.notification.create.mockResolvedValue({
				id: "accept-notification-id",
				userId: testUsers.client.id,
				type: "booking_accepted",
				title: "Reserva Aceita",
				message: "Sua reserva foi aceita pelo profissional",
				read: false,
				data: { bookingId: testBooking.id },
				createdAt: new Date(),
			});

			const result = await bookingService.acceptBooking({
				bookingId: testBooking.id,
			});

			expect(result.status).toBe("accepted");

			// Verify booking was updated
			expect(mockDb.booking.update).toHaveBeenCalledWith({
				where: { id: testBooking.id },
				data: { status: "accepted" },
			});

			// Verify notification was created
			expect(mockDb.notification.create).toHaveBeenCalled();
		});

		it("should only allow provider to accept booking", async () => {
			const bookingService = createBookingService({
				db: asPrismaClient(mockDb),
				currentUser: testUsers.client,
				currentUserId: testUsers.client.id,
			});

			mockDb.booking.findUnique.mockResolvedValue(testBooking);

			await expect(
				bookingService.acceptBooking({ bookingId: testBooking.id }),
			).rejects.toThrow(TRPCError);
		});

		it("should only accept pending bookings", async () => {
			const acceptedBooking = {
				...testBooking,
				status: "accepted" as const,
			};

			mockDb.booking.findUnique.mockResolvedValue(acceptedBooking);

			const bookingService = createBookingService({
				db: asPrismaClient(mockDb),
				currentUser: testUsers.professional,
				currentUserId: testUsers.professional.id,
			});

			await expect(
				bookingService.acceptBooking({ bookingId: testBooking.id }),
			).rejects.toThrow(TRPCError);
		});
	});

	describe("declineBooking", () => {
		const testBooking = {
			id: "test-booking-id",
			serviceId: testService.id,
			clientId: testUsers.client.id,
			providerId: testUsers.professional.id,
			bookingDate: new Date("2024-12-25T10:00:00Z"),
			endDate: null,
			totalPrice: 50.0,
			status: "pending" as const,
			notes: null,
			address: null,
			cancellationReason: null,
			cancelledBy: null,
			completedAt: null,
			createdAt: new Date(),
			updatedAt: new Date(),
		};

		const testPayment = {
			id: "test-payment-id",
			bookingId: testBooking.id,
			amount: 50.0,
			status: "pending" as const,
			serviceFee: 5.0,
			netAmount: 45.0,
			externalPaymentId: null,
			refundAmount: null,
			refundedAt: null,
			escrowReleaseDate: null,
			createdAt: new Date(),
			updatedAt: new Date(),
		};

		it("should successfully decline a booking", async () => {
			const bookingService = createBookingService({
				db: asPrismaClient(mockDb),
				currentUser: testUsers.professional,
				currentUserId: testUsers.professional.id,
			});

			const bookingWithService = {
				...testBooking,
				service: testService,
				client: testUsers.client,
				payment: {
					id: "payment-id",
					bookingId: testBooking.id,
					amount: 100,
					status: "pending",
					serviceFee: 10,
					netAmount: 90,
					externalPaymentId: null,
					refundAmount: null,
					refundedAt: null,
					escrowReleaseDate: null,
					createdAt: new Date(),
					updatedAt: new Date(),
				},
			};
			mockDb.booking.findUnique.mockResolvedValue(bookingWithService);

			const declinedBooking = {
				...testBooking,
				status: "declined" as const,
				cancellationReason: "Schedule conflict",
				cancelledBy: testUsers.professional.id,
			};
			mockDb.booking.update.mockResolvedValue(declinedBooking);

			// Mock payment update - the actual code uses update, not updateMany
			mockDb.payment.update.mockResolvedValue({
				id: "payment-id",
				bookingId: testBooking.id,
				amount: 100,
				status: "failed",
				serviceFee: 10,
				netAmount: 90,
				externalPaymentId: null,
				refundAmount: null,
				refundedAt: null,
				escrowReleaseDate: null,
				createdAt: new Date(),
				updatedAt: new Date(),
			});

			mockDb.service.update.mockResolvedValue({
				...testService,
				bookingCount: 0,
			});

			mockDb.notification.create.mockResolvedValue({
				id: "notification-id",
				userId: "user-id",
				type: "new_booking",
				title: "Notification",
				message: "Test notification",
				read: false,
				data: null,
				createdAt: new Date(),
			});

			// Mock user lookup for notification
			mockDb.user.findUnique.mockResolvedValue(testUsers.client);

			const result = await bookingService.declineBooking({
				bookingId: testBooking.id,
				reason: "Schedule conflict",
			});

			expect(result.status).toBe("declined");
			expect(result.cancellationReason).toBe("Schedule conflict");
			expect(result.cancelledBy).toBe(testUsers.professional.id);

			// Verify payment was marked as failed
			expect(mockDb.payment.update).toHaveBeenCalledWith({
				where: { id: "payment-id" },
				data: { status: "failed" },
			});

			// Verify service booking count was decremented
			expect(mockDb.service.update).toHaveBeenCalledWith({
				where: { id: testService.id },
				data: { bookingCount: { decrement: 1 } },
			});

			// Verify notification was created
			expect(mockDb.notification.create).toHaveBeenCalled();
		});
	});

	describe("updateBookingStatus", () => {
		const testBooking = {
			id: "test-booking-id",
			serviceId: testService.id,
			clientId: testUsers.client.id,
			providerId: testUsers.professional.id,
			bookingDate: new Date("2024-12-25T10:00:00Z"),
			endDate: null,
			totalPrice: 50.0,
			status: "accepted" as const,
			notes: null,
			address: null,
			cancellationReason: null,
			cancelledBy: null,
			completedAt: null,
			createdAt: new Date(),
			updatedAt: new Date(),
		};

		it("should mark booking as completed (provider only)", async () => {
			const bookingService = createBookingService({
				db: asPrismaClient(mockDb),
				currentUser: testUsers.professional,
				currentUserId: testUsers.professional.id,
			});

			const bookingWithService = {
				...testBooking,
				service: testService,
				client: testUsers.client,
				payment: {
					id: "payment-id",
					bookingId: testBooking.id,
					amount: 50,
					status: "pending",
					serviceFee: 5,
					netAmount: 45,
					externalPaymentId: null,
					refundAmount: null,
					refundedAt: null,
					escrowReleaseDate: null,
					createdAt: new Date(),
					updatedAt: new Date(),
				},
			};
			mockDb.booking.findUnique.mockResolvedValue(bookingWithService);

			const completedAt = new Date();
			const escrowReleaseDate = new Date(
				completedAt.getTime() + 15 * 24 * 60 * 60 * 1000,
			);

			const completedBooking = {
				...testBooking,
				status: "completed" as const,
				completedAt,
			};
			mockDb.booking.update.mockResolvedValue(completedBooking);

			mockDb.payment.update.mockResolvedValue({
				id: "payment-id",
				bookingId: testBooking.id,
				amount: 50,
				status: "paid",
				serviceFee: 5,
				netAmount: 45,
				externalPaymentId: null,
				refundAmount: null,
				refundedAt: null,
				escrowReleaseDate,
				createdAt: new Date(),
				updatedAt: new Date(),
			});
			mockDb.notification.create.mockResolvedValue({
				id: "notification-id",
				userId: "user-id",
				type: "new_booking",
				title: "Notification",
				message: "Test notification",
				read: false,
				data: null,
				createdAt: new Date(),
			});

			const result = await bookingService.updateBookingStatus({
				bookingId: testBooking.id,
				status: "completed",
			});

			expect(result.status).toBe("completed");
			expect(result.completedAt).toBeTruthy();

			// Verify payment was updated with escrow
			expect(mockDb.payment.update).toHaveBeenCalled();

			// Verify notification was created
			expect(mockDb.notification.create).toHaveBeenCalled();
		});

		it("should only allow provider to mark as completed", async () => {
			const bookingService = createBookingService({
				db: asPrismaClient(mockDb),
				currentUser: testUsers.client,
				currentUserId: testUsers.client.id,
			});

			mockDb.booking.findUnique.mockResolvedValue(testBooking);

			await expect(
				bookingService.updateBookingStatus({
					bookingId: testBooking.id,
					status: "completed",
				}),
			).rejects.toThrow(TRPCError);
		});

		it("should allow cancellation by either party", async () => {
			const bookingService = createBookingService({
				db: asPrismaClient(mockDb),
				currentUser: testUsers.client,
				currentUserId: testUsers.client.id,
			});

			const bookingWithService = {
				...testBooking,
				service: testService,
				client: testUsers.client,
				payment: {
					id: "payment-id",
					bookingId: testBooking.id,
					amount: 50,
					status: "pending",
					serviceFee: 5,
					netAmount: 45,
					externalPaymentId: null,
					refundAmount: null,
					refundedAt: null,
					escrowReleaseDate: null,
					createdAt: new Date(),
					updatedAt: new Date(),
				},
			};
			mockDb.booking.findUnique.mockResolvedValue(bookingWithService);

			const cancelledBooking = {
				...testBooking,
				status: "cancelled" as const,
				cancellationReason: "Changed my mind",
				cancelledBy: testUsers.client.id,
			};
			mockDb.booking.update.mockResolvedValue(cancelledBooking);

			mockDb.payment.update.mockResolvedValue({
				id: "payment-id",
				bookingId: testBooking.id,
				amount: 50,
				status: "refunded",
				serviceFee: 5,
				netAmount: 45,
				externalPaymentId: null,
				refundAmount: 50,
				refundedAt: new Date(),
				escrowReleaseDate: null,
				createdAt: new Date(),
				updatedAt: new Date(),
			});
			mockDb.notification.create.mockResolvedValue({
				id: "notification-id",
				userId: "user-id",
				type: "new_booking",
				title: "Notification",
				message: "Test notification",
				read: false,
				data: null,
				createdAt: new Date(),
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
			expect(mockDb.payment.update).toHaveBeenCalledWith({
				where: { id: "payment-id" },
				data: expect.objectContaining({
					status: "refunded",
					refundAmount: 50,
					refundedAt: expect.any(Date),
				}),
			});
		});

		it("should only complete accepted bookings", async () => {
			const pendingBooking = {
				...testBooking,
				status: "pending" as const,
			};

			mockDb.booking.findUnique.mockResolvedValue(pendingBooking);

			const bookingService = createBookingService({
				db: asPrismaClient(mockDb),
				currentUser: testUsers.professional,
				currentUserId: testUsers.professional.id,
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
		it("should list client bookings", async () => {
			const bookingService = createBookingService({
				db: asPrismaClient(mockDb),
				currentUser: testUsers.client,
				currentUserId: testUsers.client.id,
			});

			const mockBookings = [
				{
					id: "booking-1",
					serviceId: testService.id,
					clientId: testUsers.client.id,
					providerId: testUsers.professional.id,
					bookingDate: new Date("2024-12-25T10:00:00Z"),
					endDate: null,
					totalPrice: 50.0,
					status: "pending",
					notes: null,
					address: null,
					cancellationReason: null,
					cancelledBy: null,
					completedAt: null,
					createdAt: new Date("2024-12-01"),
					updatedAt: new Date("2024-12-01"),
					service: testService,
					client: testUsers.client,
					provider: testUsers.professional,
					payment: [],
				},
				{
					id: "booking-2",
					serviceId: testService.id,
					clientId: testUsers.client.id,
					providerId: testUsers.professional.id,
					bookingDate: new Date("2024-12-26T10:00:00Z"),
					endDate: null,
					totalPrice: 75.0,
					status: "accepted",
					notes: null,
					address: null,
					cancellationReason: null,
					cancelledBy: null,
					completedAt: null,
					createdAt: new Date("2024-12-02"),
					updatedAt: new Date("2024-12-02"),
					service: testService,
					client: testUsers.client,
					provider: testUsers.professional,
					payment: [],
				},
			];

			mockDb.booking.findMany.mockResolvedValue(mockBookings);

			const result = await bookingService.listBookings({
				role: "client",
				limit: 10,
			});

			expect(result.bookings).toHaveLength(2);
			expect(result.bookings[0]?.clientId).toBe(testUsers.client.id);
			expect(result.bookings[1]?.clientId).toBe(testUsers.client.id);

			// Verify the query was made with correct filters
			expect(mockDb.booking.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: { clientId: testUsers.client.id },
				}),
			);
		});

		it("should list provider bookings", async () => {
			const bookingService = createBookingService({
				db: asPrismaClient(mockDb),
				currentUser: testUsers.professional,
				currentUserId: testUsers.professional.id,
			});

			const mockBookings = [
				{
					id: "booking-1",
					serviceId: testService.id,
					clientId: testUsers.client.id,
					providerId: testUsers.professional.id,
					bookingDate: new Date("2024-12-25T10:00:00Z"),
					endDate: null,
					totalPrice: 50.0,
					status: "pending",
					notes: null,
					address: null,
					cancellationReason: null,
					cancelledBy: null,
					completedAt: null,
					createdAt: new Date("2024-12-01"),
					updatedAt: new Date("2024-12-01"),
					service: testService,
					client: testUsers.client,
					provider: testUsers.professional,
					payment: [],
				},
			];

			mockDb.booking.findMany.mockResolvedValue(mockBookings);

			const result = await bookingService.listBookings({
				role: "provider",
				limit: 10,
			});

			expect(result.bookings).toHaveLength(1);
			expect(result.bookings[0]?.providerId).toBe(testUsers.professional.id);

			// Verify the query was made with correct filters
			expect(mockDb.booking.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: { providerId: testUsers.professional.id },
				}),
			);
		});

		it("should filter by status", async () => {
			const bookingService = createBookingService({
				db: asPrismaClient(mockDb),
				currentUser: testUsers.client,
				currentUserId: testUsers.client.id,
			});

			const mockBookings = [
				{
					id: "booking-1",
					serviceId: testService.id,
					clientId: testUsers.client.id,
					providerId: testUsers.professional.id,
					bookingDate: new Date("2024-12-25T10:00:00Z"),
					endDate: null,
					totalPrice: 50.0,
					status: "pending",
					notes: null,
					address: null,
					cancellationReason: null,
					cancelledBy: null,
					completedAt: null,
					createdAt: new Date("2024-12-01"),
					updatedAt: new Date("2024-12-01"),
					service: testService,
					client: testUsers.client,
					provider: testUsers.professional,
					payment: [],
				},
			];

			mockDb.booking.findMany.mockResolvedValue(mockBookings);

			const result = await bookingService.listBookings({
				role: "client",
				status: "pending",
				limit: 10,
			});

			expect(result.bookings).toHaveLength(1);
			expect(result.bookings[0]?.status).toBe("pending");

			// Verify the query included status filter
			expect(mockDb.booking.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: {
						clientId: testUsers.client.id,
						status: "pending",
					},
				}),
			);
		});

		it("should handle pagination", async () => {
			const bookingService = createBookingService({
				db: asPrismaClient(mockDb),
				currentUser: testUsers.client,
				currentUserId: testUsers.client.id,
			});

			const mockBookings = [
				{
					id: "booking-1",
					serviceId: testService.id,
					clientId: testUsers.client.id,
					providerId: testUsers.professional.id,
					bookingDate: new Date("2024-12-25T10:00:00Z"),
					endDate: null,
					totalPrice: 50.0,
					status: "pending",
					notes: null,
					address: null,
					cancellationReason: null,
					cancelledBy: null,
					completedAt: null,
					createdAt: new Date("2024-12-01"),
					updatedAt: new Date("2024-12-01"),
					service: testService,
					client: testUsers.client,
					provider: testUsers.professional,
					payment: [],
				},
			];

			mockDb.booking.findMany.mockResolvedValue(mockBookings);

			const result = await bookingService.listBookings({
				role: "client",
				limit: 1,
			});

			expect(result.bookings).toHaveLength(1);
			// Since we only have 1 item and limit is 1, there should be no next cursor
			expect(result.nextCursor).toBeUndefined();
		});
	});
});
