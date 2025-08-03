import type { PrismaClient } from "@prisma/client";
import type { Mock } from "vitest";

// Create a type that mocks all Prisma model operations
type MockModelOperations = {
	create: Mock;
	createMany: Mock;
	findUnique: Mock;
	findUniqueOrThrow: Mock;
	findFirst: Mock;
	findMany: Mock;
	update: Mock;
	updateMany: Mock;
	delete: Mock;
	deleteMany: Mock;
	upsert: Mock;
	count: Mock;
	aggregate?: Mock;
	groupBy?: Mock;
};

// Type for the mock Prisma client with all model operations mocked
export type MockPrismaClient = {
	user: MockModelOperations;
	service: MockModelOperations;
	booking: MockModelOperations & { groupBy: Mock };
	payment: MockModelOperations & { aggregate: Mock; groupBy: Mock };
	notification: MockModelOperations;
	category: MockModelOperations;
	review: MockModelOperations & { aggregate: Mock; groupBy: Mock };
	withdrawal: MockModelOperations & { aggregate: Mock };
	bankAccount: MockModelOperations;
	image: MockModelOperations;
	waitlist: MockModelOperations;
	recurringBooking: MockModelOperations;
	groupBooking: MockModelOperations;
	serviceAddOn: MockModelOperations;
	serviceBundle: MockModelOperations;
	bookingAddOn: MockModelOperations;
	bookingReminder: MockModelOperations;
	groupBookingSettings: MockModelOperations;
	bookingPolicy: MockModelOperations;
	timeSlot: MockModelOperations;
	$connect: Mock;
	$disconnect: Mock;
	$transaction: Mock;
	$queryRaw: Mock;
	$executeRaw: Mock;
	$executeRawUnsafe: Mock;
	$queryRawUnsafe: Mock;
};

// Type guard to cast to PrismaClient when needed
export function asPrismaClient(mockDb: MockPrismaClient): PrismaClient {
	return mockDb as unknown as PrismaClient;
}
