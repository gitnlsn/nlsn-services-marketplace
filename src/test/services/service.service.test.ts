import { TRPCError } from "@trpc/server";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createServiceService } from "~/server/services/service-service";
import {
	createTestCategory,
	createTestProfessional,
	createTestService,
	createTestUser,
	setupTestDatabase,
	teardownTestDatabase,
	testDb,
} from "../helpers/database";
import { asPrismaClient } from "../types";

describe("ServiceService Integration Tests", () => {
	setupTestDatabase();

	let testProfessional: Awaited<ReturnType<typeof createTestProfessional>>;
	let testUser: Awaited<ReturnType<typeof createTestUser>>;
	let testCategory: Awaited<ReturnType<typeof createTestCategory>>;

	beforeAll(async () => {
		testProfessional = await createTestProfessional();
		testUser = await createTestUser();
		testCategory = await createTestCategory();
	});

	afterAll(async () => {
		await teardownTestDatabase();
	});

	describe("createService", () => {
		it("should create service for professional user", async () => {
			// Create service instance with authenticated professional
			const serviceService = createServiceService({
				db: asPrismaClient(testDb),
				currentUser: testProfessional,
			});

			const serviceData = {
				title: "Test Service Creation",
				description: "A test service for creation testing",
				price: 15000,
				priceType: "fixed" as const,
				categoryId: testCategory.id,
				duration: 120,
				location: "Test Location",
				maxBookings: 5,
				images: ["https://example.com/image1.jpg"],
			};

			// Mock category verification
			testDb.category.findUnique.mockResolvedValueOnce(testCategory);

			// Mock service creation
			const createdService = {
				id: "service-1",
				...serviceData,
				providerId: testProfessional.id,
				status: "active",
				viewCount: 0,
				bookingCount: 0,
				createdAt: new Date(),
				updatedAt: new Date(),
			};
			testDb.service.create.mockResolvedValueOnce(createdService);

			const result = await serviceService.createService(serviceData);

			expect(result.title).toBe(serviceData.title);
			expect(result.price).toBe(serviceData.price);
			expect(result.providerId).toBe(testProfessional.id);
			expect(result.status).toBe("active");
		});

		it("should reject service creation for non-professional user", async () => {
			// Create service instance with non-professional user
			const serviceService = createServiceService({
				db: asPrismaClient(testDb),
				currentUser: testUser, // Non-professional
			});

			const serviceData = {
				title: "Test Service",
				description: "A test service description",
				price: 10000,
				priceType: "fixed" as const,
				categoryId: testCategory.id,
			};

			await expect(serviceService.createService(serviceData)).rejects.toThrow(
				"Only professionals can create services",
			);
		});

		it("should reject service creation with invalid category", async () => {
			// Create service instance with authenticated professional
			const serviceService = createServiceService({
				db: asPrismaClient(testDb),
				currentUser: testProfessional,
			});

			const serviceData = {
				title: "Test Service",
				description: "A test service description",
				price: 10000,
				priceType: "fixed" as const,
				categoryId: "invalid-category-id",
			};

			// Mock category not found
			testDb.category.findUnique.mockResolvedValueOnce(null);

			await expect(serviceService.createService(serviceData)).rejects.toThrow(
				"Category not found",
			);
		});
	});

	describe("updateService", () => {
		it("should update service for owner", async () => {
			const service = await createTestService(
				testProfessional.id,
				testCategory.id,
			);

			// Create service instance with authenticated owner
			const serviceService = createServiceService({
				db: asPrismaClient(testDb),
				currentUser: testProfessional,
			});

			const updateData = {
				serviceId: service.id,
				title: "Updated Service Title",
				price: 20000,
				description: "Updated description",
			};

			// Mock service lookup
			testDb.service.findUnique.mockResolvedValueOnce(service);

			// Mock service update
			const updatedService = { ...service, ...updateData };
			testDb.service.update.mockResolvedValueOnce(updatedService);

			const result = await serviceService.updateService(updateData);

			expect(result.title).toBe(updateData.title);
			expect(result.price).toBe(updateData.price);
			expect(result.description).toBe(updateData.description);
		});

		it("should reject update for non-owner", async () => {
			const service = await createTestService(
				testProfessional.id,
				testCategory.id,
			);
			const otherPro = await createTestProfessional({
				email: "other@example.com",
				cpf: "98765432100",
			});

			// Create service instance with different professional
			const serviceService = createServiceService({
				db: asPrismaClient(testDb),
				currentUser: otherPro,
			});

			const updateData = {
				serviceId: service.id,
				title: "Unauthorized Update",
			};

			// Mock service lookup
			testDb.service.findUnique.mockResolvedValueOnce(service);

			await expect(serviceService.updateService(updateData)).rejects.toThrow(
				"You can only update your own services",
			);
		});

		it("should reject update for non-existent service", async () => {
			// Create service instance with authenticated professional
			const serviceService = createServiceService({
				db: asPrismaClient(testDb),
				currentUser: testProfessional,
			});

			const updateData = {
				serviceId: "non-existent-id",
				title: "Update Non-existent",
			};

			// Mock service not found
			testDb.service.findUnique.mockResolvedValueOnce(null);

			await expect(serviceService.updateService(updateData)).rejects.toThrow(
				"Service not found",
			);
		});
	});

	describe("updateServiceStatus", () => {
		it("should update service status for owner", async () => {
			const service = await createTestService(
				testProfessional.id,
				testCategory.id,
			);

			// Create service instance with authenticated owner
			const serviceService = createServiceService({
				db: asPrismaClient(testDb),
				currentUser: testProfessional,
			});

			// Mock service lookup
			testDb.service.findUnique.mockResolvedValueOnce(service);

			// Mock booking count (no pending bookings)
			testDb.booking.count.mockResolvedValueOnce(0);

			// Mock status update
			const updatedService = { ...service, status: "inactive" };
			testDb.service.update.mockResolvedValueOnce(updatedService);

			const result = await serviceService.updateServiceStatus({
				serviceId: service.id,
				status: "inactive",
			});

			expect(result.status).toBe("inactive");
		});

		it("should reject deactivation if service has pending bookings", async () => {
			const service = await createTestService(
				testProfessional.id,
				testCategory.id,
			);

			// Create service instance with authenticated owner
			const serviceService = createServiceService({
				db: asPrismaClient(testDb),
				currentUser: testProfessional,
			});

			// Mock service lookup
			testDb.service.findUnique.mockResolvedValueOnce(service);

			// Mock booking count (has pending bookings)
			testDb.booking.count.mockResolvedValueOnce(1);

			await expect(
				serviceService.updateServiceStatus({
					serviceId: service.id,
					status: "inactive",
				}),
			).rejects.toThrow("Cannot deactivate service with pending bookings");
		});
	});

	describe("getServiceById", () => {
		it("should return service with full details and increment view count", async () => {
			const service = await createTestService(
				testProfessional.id,
				testCategory.id,
			);

			// Create service instance (no auth required for getServiceById)
			const serviceService = createServiceService({
				db: asPrismaClient(testDb),
			});

			// Mock service lookup with full details
			const serviceWithDetails = {
				...service,
				provider: testProfessional,
				category: testCategory,
				_count: { bookings: 0, reviews: 0 },
			};
			testDb.service.findUnique.mockResolvedValueOnce(serviceWithDetails);

			// Mock view count increment
			testDb.service.update.mockResolvedValueOnce({
				...serviceWithDetails,
				viewCount: 1,
			});

			const result = await serviceService.getServiceById({
				serviceId: service.id,
			});

			expect(result.id).toBe(service.id);
			expect(result.provider).toBeDefined();
			expect(result.category).toBeDefined();
			expect(result._count).toBeDefined();
		});

		it("should throw error for non-existent service", async () => {
			// Create service instance
			const serviceService = createServiceService({
				db: asPrismaClient(testDb),
			});

			// Mock service not found
			testDb.service.findUnique.mockResolvedValueOnce(null);

			await expect(
				serviceService.getServiceById({ serviceId: "non-existent-id" }),
			).rejects.toThrow("Service not found");
		});
	});

	describe("listServicesByProvider", () => {
		it("should list services by provider with pagination", async () => {
			// Create service instance
			const serviceService = createServiceService({
				db: asPrismaClient(testDb),
			});

			// Create multiple test services
			const services = [
				await createTestService(testProfessional.id, testCategory.id, {
					title: "Service 1",
				}),
				await createTestService(testProfessional.id, testCategory.id, {
					title: "Service 2",
				}),
				await createTestService(testProfessional.id, testCategory.id, {
					title: "Service 3",
				}),
			];

			// Mock the service listing - return 3 items when limit is 2 to trigger pagination
			testDb.service.findMany.mockResolvedValueOnce([
				services[0],
				services[1],
				services[2],
			]);

			const result = await serviceService.listServicesByProvider({
				providerId: testProfessional.id,
				status: "all",
				limit: 2,
			});

			expect(result.services).toHaveLength(2);
			expect(result.nextCursor).toBeDefined();
		});

		it("should filter by status", async () => {
			// Create service instance
			const serviceService = createServiceService({
				db: asPrismaClient(testDb),
			});

			const activeService = await createTestService(
				testProfessional.id,
				testCategory.id,
				{
					status: "active",
				},
			);
			const inactiveService = await createTestService(
				testProfessional.id,
				testCategory.id,
				{
					status: "inactive",
				},
			);

			// Mock active service query
			testDb.service.findMany.mockResolvedValueOnce([activeService]);

			const activeResult = await serviceService.listServicesByProvider({
				providerId: testProfessional.id,
				status: "active",
				limit: 20,
			});

			// Mock inactive service query
			testDb.service.findMany.mockResolvedValueOnce([inactiveService]);

			const inactiveResult = await serviceService.listServicesByProvider({
				providerId: testProfessional.id,
				status: "inactive",
				limit: 20,
			});

			expect(activeResult.services).toHaveLength(1);
			expect(activeResult.services[0]?.status).toBe("active");
			expect(inactiveResult.services).toHaveLength(1);
			expect(inactiveResult.services[0]?.status).toBe("inactive");
		});
	});

	describe("listMyServices", () => {
		it("should list user's services with earnings", async () => {
			const service = await createTestService(
				testProfessional.id,
				testCategory.id,
			);

			// Create service instance with authenticated professional
			const serviceService = createServiceService({
				db: asPrismaClient(testDb),
				currentUser: testProfessional,
			});

			// Mock service listing
			testDb.service.findMany.mockResolvedValueOnce([service]);

			// Mock payment aggregation for earnings
			testDb.payment.aggregate.mockResolvedValueOnce({
				_sum: { netAmount: 9000 },
				_count: null,
				_avg: null,
				_max: null,
				_min: null,
			});

			const result = await serviceService.listMyServices({
				status: "all",
				limit: 20,
			});

			expect(result.services).toHaveLength(1);
			expect(result.services[0]?.totalEarnings).toBe(9000);
		});
	});

	describe("deleteService", () => {
		it("should delete service with no bookings", async () => {
			const service = await createTestService(
				testProfessional.id,
				testCategory.id,
			);

			// Create service instance with authenticated owner
			const serviceService = createServiceService({
				db: asPrismaClient(testDb),
				currentUser: testProfessional,
			});

			// Mock service lookup
			testDb.service.findUnique.mockResolvedValueOnce(service);

			// Mock booking count (no bookings)
			testDb.booking.count.mockResolvedValueOnce(0);

			// Mock service deletion
			testDb.service.delete.mockResolvedValueOnce(service);

			const result = await serviceService.deleteService({
				serviceId: service.id,
			});

			expect(result.success).toBe(true);
		});

		it("should reject deletion if service has bookings", async () => {
			const service = await createTestService(
				testProfessional.id,
				testCategory.id,
			);

			// Create service instance with authenticated owner
			const serviceService = createServiceService({
				db: asPrismaClient(testDb),
				currentUser: testProfessional,
			});

			// Mock service lookup
			testDb.service.findUnique.mockResolvedValueOnce(service);

			// Mock booking count (has bookings)
			testDb.booking.count.mockResolvedValueOnce(1);

			await expect(
				serviceService.deleteService({ serviceId: service.id }),
			).rejects.toThrow(
				"Cannot delete service with existing bookings. Deactivate it instead.",
			);
		});
	});

	describe("getServiceStats", () => {
		it("should return comprehensive service statistics", async () => {
			const service = await createTestService(
				testProfessional.id,
				testCategory.id,
			);

			// Create service instance with authenticated owner
			const serviceService = createServiceService({
				db: asPrismaClient(testDb),
				currentUser: testProfessional,
			});

			// Mock service lookup
			testDb.service.findUnique.mockResolvedValueOnce(service);

			// Mock booking statistics
			testDb.booking.count.mockResolvedValueOnce(2); // Total bookings
			testDb.booking.groupBy.mockResolvedValueOnce([
				{ status: "completed", _count: { status: 1 } },
				{ status: "pending", _count: { status: 1 } },
			]);

			// Mock earnings statistics
			testDb.payment.aggregate.mockResolvedValueOnce({
				_sum: { netAmount: 10000 },
				_count: { _all: 1 },
				_avg: { netAmount: 10000 },
				_min: null,
				_max: null,
			});

			// Mock review statistics
			testDb.review.aggregate.mockResolvedValueOnce({
				_avg: { rating: 5.0 },
				_count: { rating: 1 },
				_sum: null,
				_min: null,
				_max: null,
			});

			// Mock rating distribution
			testDb.review.groupBy.mockResolvedValueOnce([
				{ rating: 5, _count: { rating: 1 } },
			]);

			// Mock monthly bookings for trends
			testDb.booking.findMany.mockResolvedValueOnce([
				{ createdAt: new Date(), status: "completed" },
				{ createdAt: new Date(), status: "pending" },
			]);

			const result = await serviceService.getServiceStats({
				serviceId: service.id,
			});

			expect(result.service.id).toBe(service.id);
			expect(result.bookings.total).toBe(2);
			expect(result.bookings.byStatus.completed).toBe(1);
			expect(result.bookings.byStatus.pending).toBe(1);
			expect(result.reviews.count).toBe(1);
			expect(result.reviews.averageRating).toBe(5);
		});

		it("should reject stats access for non-owner", async () => {
			const service = await createTestService(
				testProfessional.id,
				testCategory.id,
			);
			const otherPro = await createTestProfessional({
				email: "other@example.com",
				cpf: "98765432100",
			});

			// Create service instance with different professional
			const serviceService = createServiceService({
				db: asPrismaClient(testDb),
				currentUser: otherPro,
			});

			// Mock service lookup
			testDb.service.findUnique.mockResolvedValueOnce(service);

			await expect(
				serviceService.getServiceStats({ serviceId: service.id }),
			).rejects.toThrow("You can only view stats for your own services");
		});
	});
});
