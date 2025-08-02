import { TRPCError } from "@trpc/server";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ServiceService } from "~/server/services/service.service";
import {
	createTestCategory,
	createTestProfessional,
	createTestService,
	createTestUser,
	setupTestDatabase,
	teardownTestDatabase,
	testDb,
} from "../helpers/database";

describe("ServiceService Integration Tests", () => {
	setupTestDatabase();

	let serviceService: ServiceService;
	let testProfessional: Awaited<ReturnType<typeof createTestProfessional>>;
	let testUser: Awaited<ReturnType<typeof createTestUser>>;
	let testCategory: Awaited<ReturnType<typeof createTestCategory>>;

	beforeAll(async () => {
		serviceService = new ServiceService(testDb);
		testProfessional = await createTestProfessional();
		testUser = await createTestUser();
		testCategory = await createTestCategory();
	});

	afterAll(async () => {
		await teardownTestDatabase();
	});

	describe("createService", () => {
		it("should create service for professional user", async () => {
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

			const result = await serviceService.createService(
				testProfessional.id,
				serviceData,
			);

			expect(result.title).toBe(serviceData.title);
			expect(result.price).toBe(serviceData.price);
			expect(result.providerId).toBe(testProfessional.id);
			expect(result.status).toBe("active");
		});

		it("should reject service creation for non-professional user", async () => {
			const serviceData = {
				title: "Test Service",
				description: "A test service description",
				price: 10000,
				priceType: "fixed" as const,
				categoryId: testCategory.id,
			};

			await expect(
				serviceService.createService(testUser.id, serviceData),
			).rejects.toThrow("Only professionals can create services");
		});

		it("should reject service creation with invalid category", async () => {
			const serviceData = {
				title: "Test Service",
				description: "A test service description",
				price: 10000,
				priceType: "fixed" as const,
				categoryId: "invalid-category-id",
			};

			await expect(
				serviceService.createService(testProfessional.id, serviceData),
			).rejects.toThrow("Category not found");
		});
	});

	describe("updateService", () => {
		it("should update service for owner", async () => {
			const service = await createTestService(
				testProfessional.id,
				testCategory.id,
			);

			const updateData = {
				serviceId: service.id,
				title: "Updated Service Title",
				price: 20000,
				description: "Updated description",
			};

			const result = await serviceService.updateService(
				testProfessional.id,
				updateData,
			);

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

			const updateData = {
				serviceId: service.id,
				title: "Unauthorized Update",
			};

			await expect(
				serviceService.updateService(otherPro.id, updateData),
			).rejects.toThrow("You can only update your own services");
		});

		it("should reject update for non-existent service", async () => {
			const updateData = {
				serviceId: "non-existent-id",
				title: "Update Non-existent",
			};

			await expect(
				serviceService.updateService(testProfessional.id, updateData),
			).rejects.toThrow("Service not found");
		});
	});

	describe("updateServiceStatus", () => {
		it("should update service status for owner", async () => {
			const service = await createTestService(
				testProfessional.id,
				testCategory.id,
			);

			const result = await serviceService.updateServiceStatus(
				testProfessional.id,
				service.id,
				"inactive",
			);

			expect(result.status).toBe("inactive");
		});

		it("should reject deactivation if service has pending bookings", async () => {
			const service = await createTestService(
				testProfessional.id,
				testCategory.id,
			);

			// Create a pending booking
			await testDb.booking.create({
				data: {
					serviceId: service.id,
					clientId: testUser.id,
					providerId: testProfessional.id,
					bookingDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
					totalPrice: 10000,
					status: "pending",
				},
			});

			await expect(
				serviceService.updateServiceStatus(
					testProfessional.id,
					service.id,
					"inactive",
				),
			).rejects.toThrow("Cannot deactivate service with pending bookings");
		});
	});

	describe("getServiceById", () => {
		it("should return service with full details and increment view count", async () => {
			const service = await createTestService(
				testProfessional.id,
				testCategory.id,
			);

			const result = await serviceService.getServiceById(service.id);

			expect(result.id).toBe(service.id);
			expect(result.provider).toBeDefined();
			expect(result.category).toBeDefined();
			expect(result._count).toBeDefined();

			// Check that view count was incremented
			const updatedService = await testDb.service.findUnique({
				where: { id: service.id },
			});
			expect(updatedService?.viewCount).toBe(1);
		});

		it("should throw error for non-existent service", async () => {
			await expect(
				serviceService.getServiceById("non-existent-id"),
			).rejects.toThrow("Service not found");
		});
	});

	describe("listServicesByProvider", () => {
		it("should list services by provider with pagination", async () => {
			// Create multiple services
			await Promise.all([
				createTestService(testProfessional.id, testCategory.id, {
					title: "Service 1",
				}),
				createTestService(testProfessional.id, testCategory.id, {
					title: "Service 2",
				}),
				createTestService(testProfessional.id, testCategory.id, {
					title: "Service 3",
				}),
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
			await createTestService(testProfessional.id, testCategory.id, {
				status: "active",
			});
			await createTestService(testProfessional.id, testCategory.id, {
				status: "inactive",
			});

			const activeResult = await serviceService.listServicesByProvider({
				providerId: testProfessional.id,
				status: "active",
			});

			const inactiveResult = await serviceService.listServicesByProvider({
				providerId: testProfessional.id,
				status: "inactive",
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

			// Create a completed booking with payment
			const booking = await testDb.booking.create({
				data: {
					serviceId: service.id,
					clientId: testUser.id,
					providerId: testProfessional.id,
					bookingDate: new Date(),
					totalPrice: 10000,
					status: "completed",
				},
			});

			await testDb.payment.create({
				data: {
					bookingId: booking.id,
					amount: 10000,
					status: "paid",
					serviceFee: 1000,
					netAmount: 9000,
					releasedAt: new Date(),
				},
			});

			const result = await serviceService.listMyServices(testProfessional.id, {
				status: "all",
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

			const result = await serviceService.deleteService(
				testProfessional.id,
				service.id,
			);

			expect(result.success).toBe(true);

			// Verify service was deleted
			const deletedService = await testDb.service.findUnique({
				where: { id: service.id },
			});
			expect(deletedService).toBeNull();
		});

		it("should reject deletion if service has bookings", async () => {
			const service = await createTestService(
				testProfessional.id,
				testCategory.id,
			);

			// Create a booking
			await testDb.booking.create({
				data: {
					serviceId: service.id,
					clientId: testUser.id,
					providerId: testProfessional.id,
					bookingDate: new Date(),
					totalPrice: 10000,
					status: "completed",
				},
			});

			await expect(
				serviceService.deleteService(testProfessional.id, service.id),
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

			// Create test bookings
			await Promise.all([
				testDb.booking.create({
					data: {
						serviceId: service.id,
						clientId: testUser.id,
						providerId: testProfessional.id,
						bookingDate: new Date(),
						totalPrice: 10000,
						status: "completed",
					},
				}),
				testDb.booking.create({
					data: {
						serviceId: service.id,
						clientId: testUser.id,
						providerId: testProfessional.id,
						bookingDate: new Date(),
						totalPrice: 15000,
						status: "pending",
					},
				}),
			]);

			// Create test reviews
			await testDb.review.createMany({
				data: [
					{
						serviceId: service.id,
						providerId: testProfessional.id,
						clientId: testUser.id,
						rating: 5,
						comment: "Excellent service",
					},
				],
			});

			const result = await serviceService.getServiceStats(
				testProfessional.id,
				service.id,
			);

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

			await expect(
				serviceService.getServiceStats(otherPro.id, service.id),
			).rejects.toThrow("You can only view stats for your own services");
		});
	});
});
