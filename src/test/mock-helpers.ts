import type { Booking, Service, User } from "@prisma/client";
import type { MockPrismaClient } from "./types";

/**
 * Helper functions for creating mock data and setting up mock behaviors
 */

export function mockUserFind(mockDb: MockPrismaClient, user: User) {
	mockDb.user.findUnique.mockResolvedValue(user);
	mockDb.user.findUniqueOrThrow.mockResolvedValue(user);
	mockDb.user.findFirst.mockResolvedValue(user);
}

export function mockServiceFind(mockDb: MockPrismaClient, service: Service) {
	mockDb.service.findUnique.mockResolvedValue(service);
	mockDb.service.findUniqueOrThrow.mockResolvedValue(service);
	mockDb.service.findFirst.mockResolvedValue(service);
}

export function mockBookingFind(mockDb: MockPrismaClient, booking: Booking) {
	mockDb.booking.findUnique.mockResolvedValue(booking);
	mockDb.booking.findUniqueOrThrow.mockResolvedValue(booking);
	mockDb.booking.findFirst.mockResolvedValue(booking);
}

export function mockTransactionSuccess(mockDb: MockPrismaClient) {
	mockDb.$transaction.mockImplementation(async (fn: unknown) => {
		if (typeof fn === "function") {
			return await fn(mockDb);
		}
		// For array of promises
		return Promise.all(fn as Promise<unknown>[]);
	});
}

export function createMockBooking(overrides = {}) {
	return {
		id: `mock-booking-${Math.random().toString(36).substr(2, 9)}`,
		serviceId: "test-service-id",
		clientId: "test-client-id",
		providerId: "test-provider-id",
		bookingDate: new Date("2024-12-25T10:00:00Z"),
		endDate: null,
		totalPrice: 10000,
		status: "pending" as const,
		notes: null,
		address: "Test Address",
		cancellationReason: null,
		cancelledBy: null,
		completedAt: null,
		createdAt: new Date(),
		updatedAt: new Date(),
		...overrides,
	};
}

export function createMockService(overrides = {}) {
	return {
		id: `mock-service-${Math.random().toString(36).substr(2, 9)}`,
		title: "Test Service",
		description: "Test service description",
		price: 10000,
		priceType: "fixed" as const,
		categoryId: "test-category-id",
		providerId: "test-provider-id",
		duration: 60,
		location: "Test Location",
		maxBookings: 5,
		status: "active" as const,
		viewCount: 0,
		bookingCount: 0,
		embedding: [],
		createdAt: new Date(),
		updatedAt: new Date(),
		...overrides,
	};
}

export function createMockUser(overrides = {}) {
	return {
		id: `mock-user-${Math.random().toString(36).substr(2, 9)}`,
		name: "Test User",
		email: "test@example.com",
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
		...overrides,
	};
}

export function createMockPayment(overrides = {}) {
	return {
		id: `mock-payment-${Math.random().toString(36).substr(2, 9)}`,
		bookingId: "test-booking-id",
		amount: 10000,
		status: "pending" as const,
		serviceFee: 1000,
		netAmount: 9000,
		externalPaymentId: null,
		refundAmount: null,
		refundedAt: null,
		escrowReleaseDate: null,
		createdAt: new Date(),
		updatedAt: new Date(),
		...overrides,
	};
}

export function createMockNotification(overrides = {}) {
	return {
		id: `mock-notification-${Math.random().toString(36).substr(2, 9)}`,
		userId: "test-user-id",
		type: "new_booking" as const,
		title: "Test Notification",
		message: "This is a test notification",
		read: false,
		data: {},
		createdAt: new Date(),
		...overrides,
	};
}

export function createMockCategory(overrides = {}) {
	return {
		id: `mock-category-${Math.random().toString(36).substr(2, 9)}`,
		name: "Test Category",
		...overrides,
	};
}

export function createMockWaitlist(overrides = {}) {
	return {
		id: `mock-waitlist-${Math.random().toString(36).substr(2, 9)}`,
		serviceId: "test-service-id",
		userId: "test-user-id",
		position: 1,
		notified: false,
		createdAt: new Date(),
		updatedAt: new Date(),
		...overrides,
	};
}

export function createMockGroupBooking(overrides = {}) {
	return {
		id: `mock-group-booking-${Math.random().toString(36).substr(2, 9)}`,
		serviceId: "test-service-id",
		organizerId: "test-organizer-id",
		groupName: "Test Group",
		participantCount: 5,
		bookingDate: new Date("2024-12-25T10:00:00Z"),
		totalPrice: 50000,
		status: "pending" as const,
		notes: null,
		createdAt: new Date(),
		updatedAt: new Date(),
		...overrides,
	};
}

export function createMockRecurringBooking(overrides = {}) {
	return {
		id: `mock-recurring-${Math.random().toString(36).substr(2, 9)}`,
		serviceId: "test-service-id",
		clientId: "test-client-id",
		providerId: "test-provider-id",
		frequency: "weekly" as const,
		startDate: new Date("2024-12-01"),
		endDate: new Date("2025-03-01"),
		dayOfWeek: 1,
		timeOfDay: "10:00",
		totalOccurrences: 12,
		completedOccurrences: 0,
		status: "active" as const,
		createdAt: new Date(),
		updatedAt: new Date(),
		...overrides,
	};
}

export function createMockServiceBundle(overrides = {}) {
	return {
		id: `mock-bundle-${Math.random().toString(36).substr(2, 9)}`,
		name: "Test Bundle",
		description: "Test bundle description",
		providerId: "test-provider-id",
		totalPrice: 25000,
		discountPercentage: 10,
		status: "active" as const,
		createdAt: new Date(),
		updatedAt: new Date(),
		...overrides,
	};
}

export function createMockBookingReminder(overrides = {}) {
	return {
		id: `mock-reminder-${Math.random().toString(36).substr(2, 9)}`,
		bookingId: "test-booking-id",
		userId: "test-user-id",
		reminderType: "email" as const,
		scheduledFor: new Date(Date.now() + 24 * 60 * 60 * 1000),
		sent: false,
		sentAt: null,
		createdAt: new Date(),
		updatedAt: new Date(),
		...overrides,
	};
}
