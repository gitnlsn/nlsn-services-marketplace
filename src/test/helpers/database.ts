import { vi } from "vitest";
import { createMockPrismaClient } from "../setup";
import type { MockPrismaClient } from "../types";

// Create a new mock Prisma instance for testing
export const testDb = createMockPrismaClient();

// Mock data creators that return predefined test data
export async function createTestUser(overrides = {}) {
	const user = {
		id: `test-user-${Math.random().toString(36).substr(2, 9)}`,
		email: "test@example.com",
		name: "Test User",
		image: "https://example.com/avatar.jpg",
		isProfessional: false,
		notificationEmail: true,
		notificationSms: false,
		notificationWhatsapp: false,
		accountBalance: 0,
		cpf: null,
		phone: null,
		bio: null,
		address: null,
		city: null,
		state: null,
		zipCode: null,
		professionalSince: null,
		emailVerified: null,
		createdAt: new Date(),
		updatedAt: new Date(),
		...overrides,
	};

	// Configure mock to return this user
	testDb.user.create.mockResolvedValueOnce(user);
	testDb.user.findUnique.mockResolvedValue(user);
	testDb.user.findUniqueOrThrow.mockResolvedValue(user);
	testDb.user.update.mockResolvedValue(user);

	return user;
}

export async function createTestProfessional(overrides = {}) {
	const professional = {
		id: `test-pro-${Math.random().toString(36).substr(2, 9)}`,
		email: "pro@example.com",
		name: "Professional User",
		image: "https://example.com/pro.jpg",
		phone: "11999999999",
		cpf: "12345678901",
		bio: "Professional user bio with experience",
		address: "Test Street, 123",
		city: "São Paulo",
		state: "SP",
		zipCode: "01234567",
		isProfessional: true,
		professionalSince: new Date(),
		accountBalance: 0,
		notificationEmail: true,
		notificationSms: true,
		notificationWhatsapp: true,
		emailVerified: null,
		createdAt: new Date(),
		updatedAt: new Date(),
		...overrides,
	};

	// Configure mock to return this professional
	testDb.user.create.mockResolvedValueOnce(professional);
	testDb.user.findUnique.mockResolvedValue(professional);
	testDb.user.findUniqueOrThrow.mockResolvedValue(professional);
	testDb.user.update.mockResolvedValue(professional);

	return professional;
}

export async function createTestCategory(overrides = {}) {
	const category = {
		id: `test-cat-${Math.random().toString(36).substr(2, 9)}`,
		name: "Test Category",
		...overrides,
	};

	// Configure mock to return this category
	testDb.category.create.mockResolvedValueOnce(category);
	testDb.category.findUnique.mockResolvedValue(category);
	testDb.category.findMany.mockResolvedValue([category]);

	return category;
}

export async function createTestService(
	providerId: string,
	categoryId: string,
	overrides = {},
) {
	const service = {
		id: `test-service-${Math.random().toString(36).substr(2, 9)}`,
		title: "Test Service",
		description: "A test service description",
		categoryId,
		providerId,
		price: 10000, // R$ 100.00 in cents
		priceType: "fixed" as const,
		location: "São Paulo, SP",
		duration: 60,
		status: "active" as const,
		bookingCount: 0,
		viewCount: 0,
		maxBookings: null,
		embedding: [],
		createdAt: new Date(),
		updatedAt: new Date(),
		...overrides,
	};

	// Configure mock to return this service
	testDb.service.create.mockResolvedValueOnce(service);
	testDb.service.findUnique.mockResolvedValue(service);
	testDb.service.findUniqueOrThrow.mockResolvedValue(service);

	return service;
}

export async function createTestBooking(
	serviceId: string,
	clientId: string,
	providerId: string,
	overrides = {},
) {
	const booking = {
		id: `test-booking-${Math.random().toString(36).substr(2, 9)}`,
		serviceId,
		clientId,
		providerId,
		bookingDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
		endDate: null,
		totalPrice: 10000,
		address: "Test Address, 123",
		status: "pending" as const,
		notes: null,
		cancellationReason: null,
		cancelledBy: null,
		completedAt: null,
		createdAt: new Date(),
		updatedAt: new Date(),
		...overrides,
	};

	// Configure mock to return this booking
	testDb.booking.create.mockResolvedValueOnce(booking);
	testDb.booking.findUnique.mockResolvedValue(booking);

	return booking;
}

// Setup and teardown hooks - now just reset mocks
export function setupTestDatabase() {
	// No actual database operations needed
	// Tests will set up their own mock behaviors
}

// Disconnect after all tests - now just a no-op
export async function teardownTestDatabase() {
	// No actual database connection to close
	// Just reset all mocks
	vi.clearAllMocks();
}

// Helper to clean up database - now just resets mocks
export async function cleanupDatabase() {
	// Reset all mock functions
	vi.clearAllMocks();
}
