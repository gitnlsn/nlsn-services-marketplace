import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, beforeEach } from "vitest";

// Test database client
export const testDb = new PrismaClient({
	datasources: {
		db: {
			url: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL,
		},
	},
});

// Test user data
export const testUsers = {
	client: {
		id: "test-client-id",
		name: "Test Client",
		email: "client@test.com",
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
	professional: {
		id: "test-professional-id",
		name: "Test Professional",
		email: "professional@test.com",
		isProfessional: true,
		accountBalance: 100.0,
		cpf: "12345678901",
		phone: "11999999999",
		bio: "Professional test user",
		address: "Test Address",
		city: "São Paulo",
		state: "SP",
		zipCode: "01234567",
		professionalSince: new Date(),
		notificationEmail: true,
		notificationSms: true,
		notificationWhatsapp: true,
		image: null,
		emailVerified: null,
		createdAt: new Date(),
		updatedAt: new Date(),
	},
};

// Test category data
export const testCategory = {
	id: "test-category-id",
	name: "Test Category",
};

// Test service data
export const testService = {
	id: "test-service-id",
	title: "Test Service",
	description: "This is a test service for testing purposes",
	price: 50.0,
	priceType: "fixed",
	categoryId: testCategory.id,
	providerId: testUsers.professional.id,
	duration: 60,
	location: "Test Location",
	maxBookings: 5,
	status: "active",
	viewCount: 0,
	bookingCount: 0,
	embedding: [],
};

// Setup and teardown functions
export async function setupTestDatabase() {
	// Create test users
	await testDb.user.createMany({
		data: [testUsers.client, testUsers.professional],
		skipDuplicates: true,
	});

	// Create test category
	await testDb.category.create({
		data: testCategory,
	});

	// Create test service
	await testDb.service.create({
		data: testService,
	});
}

export async function cleanupTestDatabase() {
	// Clean up in reverse order of dependencies
	await testDb.review.deleteMany();
	await testDb.notification.deleteMany();
	await testDb.payment.deleteMany();
	await testDb.booking.deleteMany();
	await testDb.withdrawal.deleteMany();
	await testDb.bankAccount.deleteMany();
	await testDb.image.deleteMany();
	await testDb.service.deleteMany();
	await testDb.category.deleteMany();
	await testDb.user.deleteMany();
}

// Vitest global setup
beforeAll(async () => {
	console.log("🔧 Setting up test database...");
	await setupTestDatabase();
});

afterAll(async () => {
	console.log("🧹 Cleaning up test database...");
	await cleanupTestDatabase();
	await testDb.$disconnect();
});

beforeEach(async () => {
	// Clean up any data created during tests (except seed data)
	await testDb.review.deleteMany({
		where: {
			NOT: { id: "seed-data" }, // Keep any seed data if exists
		},
	});
	await testDb.notification.deleteMany({
		where: {
			NOT: { id: "seed-data" },
		},
	});
	await testDb.payment.deleteMany({
		where: {
			NOT: { id: "seed-data" },
		},
	});
	await testDb.booking.deleteMany({
		where: {
			NOT: { id: "seed-data" },
		},
	});
	await testDb.withdrawal.deleteMany({
		where: {
			NOT: { id: "seed-data" },
		},
	});
	await testDb.bankAccount.deleteMany({
		where: {
			NOT: { id: "seed-data" },
		},
	});
});
