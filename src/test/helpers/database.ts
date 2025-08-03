import { PrismaClient } from "@prisma/client";
import { afterEach, beforeEach } from "vitest";

// Create a new Prisma instance for testing
export const testDb = new PrismaClient({
	datasources: {
		db: {
			url: process.env.DATABASE_URL,
		},
	},
});

// Helper to clean up database between tests
export async function cleanupDatabase() {
	const tablenames = await testDb.$queryRaw<
		Array<{ tablename: string }>
	>`SELECT tablename FROM pg_tables WHERE schemaname='public'`;

	const tables = tablenames
		.map(({ tablename }) => tablename)
		.filter((name) => name !== "_prisma_migrations")
		.map((name) => `"public"."${name}"`)
		.join(", ");

	try {
		await testDb.$executeRawUnsafe(`TRUNCATE TABLE ${tables} CASCADE;`);
	} catch (error) {
		console.log({ error });
	}
}

// Helper to create test data
export async function createTestUser(overrides = {}) {
	return testDb.user.create({
		data: {
			email: "test@example.com",
			name: "Test User",
			image: "https://example.com/avatar.jpg",
			isProfessional: false,
			notificationEmail: true,
			notificationSms: false,
			notificationWhatsapp: false,
			...overrides,
		},
	});
}

export async function createTestProfessional(overrides = {}) {
	return testDb.user.create({
		data: {
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
			...overrides,
		},
	});
}

export async function createTestCategory(overrides = {}) {
	return testDb.category.create({
		data: {
			name: "Test Category",
			...overrides,
		},
	});
}

export async function createTestService(
	providerId: string,
	categoryId: string,
	overrides = {},
) {
	return testDb.service.create({
		data: {
			title: "Test Service",
			description: "A test service description",
			categoryId,
			providerId,
			price: 10000, // R$ 100.00 in cents
			priceType: "fixed",
			location: "São Paulo, SP",
			duration: 60,
			status: "active",
			bookingCount: 0,
			...overrides,
		},
	});
}

export async function createTestBooking(
	serviceId: string,
	clientId: string,
	providerId: string,
	overrides = {},
) {
	return testDb.booking.create({
		data: {
			serviceId,
			clientId,
			providerId,
			bookingDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
			totalPrice: 10000,
			address: "Test Address, 123",
			status: "pending",
			...overrides,
		},
	});
}

// Setup and teardown hooks
export function setupTestDatabase() {
	beforeEach(async () => {
		await cleanupDatabase();
	});

	afterEach(async () => {
		await cleanupDatabase();
	});
}

// Disconnect after all tests
export async function teardownTestDatabase() {
	await testDb.$disconnect();
}
