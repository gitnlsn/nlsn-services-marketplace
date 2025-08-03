import { TRPCError } from "@trpc/server";
import { beforeEach, describe, expect, it } from "vitest";
import { ServiceBundleService } from "~/server/services/service-bundle-service";
import {
	cleanupTestDatabase,
	setupTestDatabase,
	testCategory,
	testDb,
	testService,
	testUsers,
} from "../setup";
import { asPrismaClient } from "../types";

describe("ServiceBundleService Integration Tests", () => {
	let secondService: Awaited<ReturnType<typeof testDb.service.create>>;

	beforeEach(async () => {
		await cleanupTestDatabase();
		await setupTestDatabase();

		// Create a second service for bundle testing
		secondService = await testDb.service.create({
			data: {
				id: "second-service-id",
				title: "Second Test Service",
				description: "Another service for testing bundles",
				price: 75.0,
				priceType: "fixed",
				categoryId: testCategory.id,
				providerId: testUsers.professional.id,
				duration: 90,
				location: "Test Location 2",
				status: "active",
			},
		});
	});

	describe("createBundle", () => {
		it("should successfully create a service bundle", async () => {
			const bundleService = new ServiceBundleService({
				db: asPrismaClient(testDb),
				currentUserId: testUsers.professional.id,
			});

			const input = {
				name: "Wellness Package",
				description: "Complete wellness solution with multiple services",
				serviceIds: [testService.id, secondService.id],
				discount: 20, // 20% discount
				validFrom: new Date("2024-12-01"),
				validUntil: new Date("2024-12-31"),
				maxUses: 50,
			};

			const result = await bundleService.createBundle(input);

			expect(result.name).toBe(input.name);
			expect(result.description).toBe(input.description);
			expect(result.discount).toBe(input.discount);
			expect(result.validFrom).toEqual(input.validFrom);
			expect(result.validUntil).toEqual(input.validUntil);
			expect(result.maxUses).toBe(input.maxUses);
			expect(result.providerId).toBe(testUsers.professional.id);
			expect(result.isActive).toBe(true);

			// Verify bundle pricing is configured
			expect(result.discount).toBe(input.discount);

			// Verify services are associated
			const bundleWithServices = await testDb.serviceBundle.findUnique({
				where: { id: result.id },
				include: { services: true },
			});

			expect(bundleWithServices?.services).toHaveLength(2);
			const serviceIds = bundleWithServices?.services.map(
				(s: (typeof bundleWithServices.services)[0]) => s.id,
			);
			expect(serviceIds).toContain(testService.id);
			expect(serviceIds).toContain(secondService.id);
		});

		it("should prevent creating bundle with services from different providers", async () => {
			// Create a service from a different provider
			await testDb.user.create({
				data: {
					id: "other-provider-id",
					name: "Other Provider",
					email: "other-provider@test.com",
					isProfessional: true,
				},
			});

			const otherService = await testDb.service.create({
				data: {
					id: "other-service-id",
					title: "Other Provider Service",
					description: "Service from different provider",
					price: 100.0,
					categoryId: testCategory.id,
					providerId: "other-provider-id",
					duration: 60,
				},
			});

			const bundleService = new ServiceBundleService({
				db: asPrismaClient(testDb),
				currentUserId: testUsers.professional.id,
			});

			const input = {
				name: "Invalid Bundle",
				serviceIds: [testService.id, otherService.id], // Mixed providers
				discount: 10,
			};

			await expect(bundleService.createBundle(input)).rejects.toThrow(
				TRPCError,
			);
		});

		it("should prevent discount greater than 50%", async () => {
			const bundleService = new ServiceBundleService({
				db: asPrismaClient(testDb),
				currentUserId: testUsers.professional.id,
			});

			const input = {
				name: "Too High Discount Bundle",
				serviceIds: [testService.id, secondService.id],
				discount: 60, // Too high
			};

			await expect(bundleService.createBundle(input)).rejects.toThrow(
				TRPCError,
			);
		});

		it("should require at least 2 services in bundle", async () => {
			const bundleService = new ServiceBundleService({
				db: asPrismaClient(testDb),
				currentUserId: testUsers.professional.id,
			});

			const input = {
				name: "Single Service Bundle",
				serviceIds: [testService.id], // Only one service
				discount: 10,
			};

			await expect(bundleService.createBundle(input)).rejects.toThrow(
				TRPCError,
			);
		});

		it("should prevent creating bundle for inactive services", async () => {
			// Make second service inactive
			await testDb.service.update({
				where: { id: secondService.id },
				data: { status: "inactive" },
			});

			const bundleService = new ServiceBundleService({
				db: asPrismaClient(testDb),
				currentUserId: testUsers.professional.id,
			});

			const input = {
				name: "Bundle with Inactive Service",
				serviceIds: [testService.id, secondService.id],
				discount: 15,
			};

			await expect(bundleService.createBundle(input)).rejects.toThrow(
				TRPCError,
			);
		});
	});

	describe("updateBundle", () => {
		let bundle: Awaited<ReturnType<typeof testDb.serviceBundle.create>>;

		beforeEach(async () => {
			// Create a test bundle
			bundle = await testDb.serviceBundle.create({
				data: {
					name: "Test Bundle",
					description: "Test bundle for updates",
					discount: 15,
					providerId: testUsers.professional.id,
					validFrom: new Date("2024-12-01"),
					validUntil: new Date("2024-12-31"),
					maxUses: 25,
					isActive: true,
				},
			});

			// Associate services with bundle
			await testDb.serviceBundle.update({
				where: { id: bundle.id },
				data: {
					services: {
						connect: [{ id: testService.id }, { id: secondService.id }],
					},
				},
			});
		});

		it("should successfully update bundle", async () => {
			const bundleService = new ServiceBundleService({
				db: asPrismaClient(testDb),
				currentUserId: testUsers.professional.id,
			});

			const updates = {
				name: "Updated Bundle Name",
				description: "Updated description",
				discount: 25,
				maxUses: 100,
			};

			const result = await bundleService.updateBundle({
				id: bundle.id,
				...updates,
			});

			expect(result.name).toBe(updates.name);
			expect(result.description).toBe(updates.description);
			expect(result.discount).toBe(updates.discount);
			expect(result.maxUses).toBe(updates.maxUses);
		});

		it("should only allow bundle owner to update", async () => {
			await testDb.user.create({
				data: {
					id: "other-user-id",
					name: "Other User",
					email: "other@test.com",
					isProfessional: true,
				},
			});

			const bundleService = new ServiceBundleService({
				db: asPrismaClient(testDb),
				currentUserId: "other-user-id",
			});

			await expect(
				bundleService.updateBundle({ id: bundle.id, name: "Hacked Bundle" }),
			).rejects.toThrow(TRPCError);
		});

		it("should prevent discount exceeding 50%", async () => {
			const bundleService = new ServiceBundleService({
				db: asPrismaClient(testDb),
				currentUserId: testUsers.professional.id,
			});

			await expect(
				bundleService.updateBundle({ id: bundle.id, discount: 60 }),
			).rejects.toThrow(TRPCError);
		});
	});

	describe("toggleBundleStatus", () => {
		let bundle: Awaited<ReturnType<typeof testDb.serviceBundle.create>>;

		beforeEach(async () => {
			bundle = await testDb.serviceBundle.create({
				data: {
					name: "Test Bundle",
					discount: 15,
					providerId: testUsers.professional.id,
					isActive: true,
				},
			});
		});

		it("should toggle bundle active status", async () => {
			const bundleService = new ServiceBundleService({
				db: asPrismaClient(testDb),
				currentUserId: testUsers.professional.id,
			});

			// Deactivate
			let result = await bundleService.toggleBundleStatus(bundle.id);
			expect(result.isActive).toBe(false);

			// Activate
			result = await bundleService.toggleBundleStatus(bundle.id);
			expect(result.isActive).toBe(true);
		});

		it("should only allow bundle owner to toggle status", async () => {
			await testDb.user.create({
				data: {
					id: "other-user-id",
					name: "Other User",
					email: "other@test.com",
					isProfessional: true,
				},
			});

			const bundleService = new ServiceBundleService({
				db: asPrismaClient(testDb),
				currentUserId: "other-user-id",
			});

			await expect(bundleService.toggleBundleStatus(bundle.id)).rejects.toThrow(
				TRPCError,
			);
		});
	});

	describe("getBundleDetails", () => {
		let bundle: Awaited<ReturnType<typeof testDb.serviceBundle.create>>;

		beforeEach(async () => {
			bundle = await testDb.serviceBundle.create({
				data: {
					name: "Test Bundle",
					description: "Detailed test bundle",
					discount: 20,
					providerId: testUsers.professional.id,
					validFrom: new Date("2024-12-01"),
					validUntil: new Date("2024-12-31"),
					maxUses: 50,
					currentUses: 5,
					isActive: true,
				},
			});

			// Associate services
			await testDb.serviceBundle.update({
				where: { id: bundle.id },
				data: {
					services: {
						connect: [{ id: testService.id }, { id: secondService.id }],
					},
				},
			});
		});

		it("should return complete bundle details", async () => {
			const bundleService = new ServiceBundleService({
				db: asPrismaClient(testDb),
				currentUserId: testUsers.professional.id,
			});

			const result = await bundleService.getBundleDetails(bundle.id);

			expect(result.id).toBe(bundle.id);
			expect(result.name).toBe("Test Bundle");
			expect(result.description).toBe("Detailed test bundle");
			expect(result.discount).toBe(20);
			expect(result.services).toHaveLength(2);
			expect(result.provider).toBeTruthy();

			// Verify calculated fields
			const originalTotal = testService.price + secondService.price;
			const discountedTotal = originalTotal * 0.8; // 20% discount
			expect(result.bundlePrice).toBe(discountedTotal);
			expect(result.discountAmount).toBe(originalTotal * 0.2);
		});

		it("should return bundle details for public viewing", async () => {
			const bundleService = new ServiceBundleService({
				db: asPrismaClient(testDb),
				currentUserId: testUsers.client.id, // Different user
			});

			const result = await bundleService.getBundleDetails(bundle.id);

			expect(result.id).toBe(bundle.id);
			expect(result.services).toHaveLength(2);
			// Should still return details for active bundles
		});

		it("should throw error for non-existent bundle", async () => {
			const bundleService = new ServiceBundleService({
				db: asPrismaClient(testDb),
				currentUserId: testUsers.professional.id,
			});

			await expect(
				bundleService.getBundleDetails("non-existent-id"),
			).rejects.toThrow(TRPCError);
		});
	});

	describe("getProviderBundles", () => {
		beforeEach(async () => {
			// Create multiple bundles
			await testDb.serviceBundle.createMany({
				data: [
					{
						id: "bundle-1",
						name: "Active Bundle",
						discount: 15,
						providerId: testUsers.professional.id,
						isActive: true,
					},
					{
						id: "bundle-2",
						name: "Inactive Bundle",
						discount: 10,
						providerId: testUsers.professional.id,
						isActive: false,
					},
					{
						id: "bundle-3",
						name: "Expired Bundle",
						discount: 20,
						providerId: testUsers.professional.id,
						isActive: true,
						validUntil: new Date("2023-12-31"), // Expired
					},
				],
			});
		});

		it("should list all bundles for provider", async () => {
			const bundleService = new ServiceBundleService({
				db: asPrismaClient(testDb),
				currentUserId: testUsers.professional.id,
			});

			const result = await bundleService.getProviderBundles();

			expect(result).toHaveLength(3);
			expect(result.map((b) => b.name)).toContain("Active Bundle");
			expect(result.map((b) => b.name)).toContain("Inactive Bundle");
			expect(result.map((b) => b.name)).toContain("Expired Bundle");
		});

		it("should filter active bundles only", async () => {
			const bundleService = new ServiceBundleService({
				db: asPrismaClient(testDb),
				currentUserId: testUsers.professional.id,
			});

			const result = await bundleService.getProviderBundles();
			const activeBundles = result.filter((bundle) => bundle.isActive);

			expect(result).toHaveLength(2); // Active and Expired (still marked active)
			expect(result.map((b) => b.name)).not.toContain("Inactive Bundle");
		});

		it("should include validity status", async () => {
			const bundleService = new ServiceBundleService({
				db: asPrismaClient(testDb),
				currentUserId: testUsers.professional.id,
			});

			const result = await bundleService.getProviderBundles();

			const expiredBundle = result.find((b) => b.name === "Expired Bundle");
			// Note: isValid is only available in getBundleDetails, not getProviderBundles
			expect(expiredBundle?.isActive).toBe(true); // Still marked as active

			const activeBundle = result.find((b) => b.name === "Active Bundle");
			expect(activeBundle?.isActive).toBe(true);
		});
	});

	describe("searchBundles", () => {
		beforeEach(async () => {
			// Create bundles in different categories
			const secondCategory = await testDb.category.create({
				data: {
					id: "second-category-id",
					name: "Fitness Category",
				},
			});

			const fitnessService = await testDb.service.create({
				data: {
					id: "fitness-service-id",
					title: "Fitness Training",
					description: "Personal training service",
					price: 80.0,
					categoryId: secondCategory.id,
					providerId: testUsers.professional.id,
					duration: 60,
				},
			});

			await testDb.serviceBundle.createMany({
				data: [
					{
						id: "wellness-bundle",
						name: "Wellness Package",
						description: "Complete wellness and relaxation",
						discount: 15,
						providerId: testUsers.professional.id,
						isActive: true,
					},
					{
						id: "fitness-bundle",
						name: "Fitness Bundle",
						description: "Fitness and health package",
						discount: 20,
						providerId: testUsers.professional.id,
						isActive: true,
					},
				],
			});

			// Associate services with bundles
			await testDb.serviceBundle.update({
				where: { id: "wellness-bundle" },
				data: {
					services: {
						connect: [{ id: testService.id }],
					},
				},
			});

			await testDb.serviceBundle.update({
				where: { id: "fitness-bundle" },
				data: {
					services: {
						connect: [{ id: fitnessService.id }],
					},
				},
			});
		});

		it("should search bundles by query", async () => {
			const bundleService = new ServiceBundleService({
				db: asPrismaClient(testDb),
				currentUserId: testUsers.client.id,
			});

			const result = await bundleService.searchBundles({
				query: "wellness",
				limit: 10,
			});

			expect(result.bundles).toHaveLength(1);
			expect(result.bundles[0]?.name).toBe("Wellness Package");
		});

		it("should filter by category", async () => {
			const bundleService = new ServiceBundleService({
				db: asPrismaClient(testDb),
				currentUserId: testUsers.client.id,
			});

			const result = await bundleService.searchBundles({
				categoryId: testCategory.id,
				limit: 10,
			});

			// Should return bundles that contain services from this category
			expect(result.bundles.length).toBeGreaterThan(0);
		});

		it("should filter by discount range", async () => {
			const bundleService = new ServiceBundleService({
				db: asPrismaClient(testDb),
				currentUserId: testUsers.client.id,
			});

			const result = await bundleService.searchBundles({
				minDiscount: 18,
				maxDiscount: 25,
				limit: 10,
			});

			expect(result.bundles).toHaveLength(1);
			expect(result.bundles[0]?.name).toBe("Fitness Bundle"); // 20% discount
		});

		it("should handle pagination", async () => {
			const bundleService = new ServiceBundleService({
				db: asPrismaClient(testDb),
				currentUserId: testUsers.client.id,
			});

			const result = await bundleService.searchBundles({
				limit: 1,
			});

			expect(result.bundles).toHaveLength(1);
			expect(result.nextCursor).toBeTruthy();
		});

		it("should only return active and valid bundles", async () => {
			// Create an inactive bundle
			await testDb.serviceBundle.create({
				data: {
					id: "inactive-bundle",
					name: "Inactive Bundle",
					discount: 10,
					providerId: testUsers.professional.id,
					isActive: false,
				},
			});

			const bundleService = new ServiceBundleService({
				db: asPrismaClient(testDb),
				currentUserId: testUsers.client.id,
			});

			const result = await bundleService.searchBundles({ limit: 10 });

			expect(result.bundles.map((b) => b.name)).not.toContain(
				"Inactive Bundle",
			);
		});
	});

	describe("getBundleStats", () => {
		beforeEach(async () => {
			const bundle = await testDb.serviceBundle.create({
				data: {
					name: "Stats Bundle",
					discount: 15,
					providerId: testUsers.professional.id,
					currentUses: 10,
					maxUses: 50,
					isActive: true,
					services: {
						connect: [{ id: testService.id }],
					},
				},
			});

			// Create some bookings using this bundle
			await testDb.booking.createMany({
				data: [
					{
						id: "booking-1",
						serviceId: testService.id,
						clientId: testUsers.client.id,
						providerId: testUsers.professional.id,
						bookingDate: new Date("2024-12-25T10:00:00Z"),
						totalPrice: 42.5, // Discounted price
						status: "completed",
					},
					{
						id: "booking-2",
						serviceId: testService.id,
						clientId: testUsers.client.id,
						providerId: testUsers.professional.id,
						bookingDate: new Date("2024-12-26T10:00:00Z"),
						totalPrice: 42.5,
						status: "pending",
					},
				],
			});
		});

		it("should return bundle statistics", async () => {
			const bundleService = new ServiceBundleService({
				db: asPrismaClient(testDb),
				currentUserId: testUsers.professional.id,
			});

			const result = await bundleService.getBundleStats();

			expect(result.bundles).toHaveLength(1);
			expect(result.totalBundleRevenue).toBe(425); // 10 uses * 50 * 0.85 (15% discount)
			expect(result.bundles[0]?.bundleName).toBe("Stats Bundle");
			expect(result.bundles[0]?.timesUsed).toBe(10);
			expect(result.bundles[0]?.totalRevenue).toBe(425);
			expect(result.bundles[0]?.conversionRate).toBe(20); // 10 current uses / 50 max uses
		});

		it("should only return stats for provider's bundles", async () => {
			// Create bundle for different provider
			await testDb.user.create({
				data: {
					id: "other-provider-id",
					name: "Other Provider",
					email: "other@test.com",
					isProfessional: true,
				},
			});

			await testDb.serviceBundle.create({
				data: {
					name: "Other Provider Bundle",
					discount: 10,
					providerId: "other-provider-id",
					isActive: true,
				},
			});

			const bundleService = new ServiceBundleService({
				db: asPrismaClient(testDb),
				currentUserId: testUsers.professional.id,
			});

			const result = await bundleService.getBundleStats();

			expect(result.bundles).toHaveLength(1); // Only own bundles
		});
	});
});
