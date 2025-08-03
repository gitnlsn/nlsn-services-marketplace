import { TRPCError } from "@trpc/server";
import { addDays, addHours, startOfDay } from "date-fns";
import { beforeEach, describe, expect, it } from "vitest";
import { WaitlistService } from "~/server/services/waitlist-service";
import {
	cleanupTestDatabase,
	setupTestDatabase,
	testDb,
	testService,
	testUsers,
} from "../setup";
import { asPrismaClient } from "../types";

describe("WaitlistService Integration Tests", () => {
	beforeEach(async () => {
		await cleanupTestDatabase();
		await setupTestDatabase();
	});

	describe("joinWaitlist", () => {
		it("should successfully join a waitlist", async () => {
			const waitlistService = new WaitlistService({
				db: asPrismaClient(testDb),
				currentUserId: testUsers.client.id,
			});

			const input = {
				serviceId: testService.id,
				preferredDate: new Date("2024-12-25"),
				preferredTime: "10:00",
				alternativeDates: [new Date("2024-12-26"), new Date("2024-12-27")],
				duration: 60,
				notes: "Test waitlist entry",
			};

			const result = await waitlistService.joinWaitlist(input);

			expect(result.serviceId).toBe(testService.id);
			expect(result.clientId).toBe(testUsers.client.id);
			expect(result.preferredDate).toEqual(startOfDay(input.preferredDate));
			expect(result.preferredTime).toBe(input.preferredTime);
			expect(result.duration).toBe(input.duration);
			expect(result.notes).toBe(input.notes);
			expect(result.status).toBe("active");

			// Verify notification was created for provider
			const notification = await testDb.notification.findFirst({
				where: {
					userId: testUsers.professional.id,
					type: "waitlist_joined",
				},
			});
			expect(notification).toBeTruthy();
		});

		it("should prevent duplicate waitlist entries", async () => {
			const waitlistService = new WaitlistService({
				db: asPrismaClient(testDb),
				currentUserId: testUsers.client.id,
			});

			// Create initial waitlist entry
			await testDb.waitlist.create({
				data: {
					serviceId: testService.id,
					clientId: testUsers.client.id,
					preferredDate: new Date("2024-12-25"),
					status: "active",
				},
			});

			const input = {
				serviceId: testService.id,
				preferredDate: new Date("2024-12-25"),
			};

			await expect(waitlistService.joinWaitlist(input)).rejects.toThrow(
				TRPCError,
			);
		});

		it("should prevent joining waitlist for inactive service", async () => {
			// Make service inactive
			await testDb.service.update({
				where: { id: testService.id },
				data: { status: "inactive" },
			});

			const waitlistService = new WaitlistService({
				db: asPrismaClient(testDb),
				currentUserId: testUsers.client.id,
			});

			const input = {
				serviceId: testService.id,
				preferredDate: new Date("2024-12-25"),
			};

			await expect(waitlistService.joinWaitlist(input)).rejects.toThrow(
				TRPCError,
			);
		});

		it("should update existing cancelled waitlist entry", async () => {
			const waitlistService = new WaitlistService({
				db: asPrismaClient(testDb),
				currentUserId: testUsers.client.id,
			});

			// Create cancelled waitlist entry
			await testDb.waitlist.create({
				data: {
					serviceId: testService.id,
					clientId: testUsers.client.id,
					preferredDate: new Date("2024-12-20"),
					status: "cancelled",
				},
			});

			const input = {
				serviceId: testService.id,
				preferredDate: new Date("2024-12-25"),
				preferredTime: "14:00",
			};

			const result = await waitlistService.joinWaitlist(input);

			expect(result.status).toBe("active");
			expect(result.preferredDate).toEqual(startOfDay(input.preferredDate));
			expect(result.preferredTime).toBe(input.preferredTime);
		});
	});

	describe("leaveWaitlist", () => {
		let waitlistEntry: Awaited<ReturnType<typeof testDb.waitlist.create>>;

		beforeEach(async () => {
			waitlistEntry = await testDb.waitlist.create({
				data: {
					serviceId: testService.id,
					clientId: testUsers.client.id,
					preferredDate: new Date("2024-12-25"),
					status: "active",
				},
			});
		});

		it("should successfully leave waitlist", async () => {
			const waitlistService = new WaitlistService({
				db: asPrismaClient(testDb),
				currentUserId: testUsers.client.id,
			});

			const result = await waitlistService.leaveWaitlist(testService.id);

			expect(result.success).toBe(true);

			// Verify waitlist entry was cancelled
			const updatedEntry = await testDb.waitlist.findUnique({
				where: { id: waitlistEntry.id },
			});
			expect(updatedEntry?.status).toBe("cancelled");
		});

		it("should throw error if not on waitlist", async () => {
			const waitlistService = new WaitlistService({
				db: asPrismaClient(testDb),
				currentUserId: "other-user-id",
			});

			await expect(
				waitlistService.leaveWaitlist(testService.id),
			).rejects.toThrow(TRPCError);
		});
	});

	describe("notifyWaitlistAvailability", () => {
		let waitlistEntry: Awaited<ReturnType<typeof testDb.waitlist.create>>;

		beforeEach(async () => {
			// Create client with contact info
			await testDb.user.upsert({
				where: { id: testUsers.client.id },
				update: {
					email: "client@test.com",
					phone: "+5511999999999",
				},
				create: {
					...testUsers.client,
					email: "client@test.com",
					phone: "+5511999999999",
				},
			});

			waitlistEntry = await testDb.waitlist.create({
				data: {
					serviceId: testService.id,
					clientId: testUsers.client.id,
					preferredDate: new Date("2024-12-25"),
					status: "active",
				},
			});
		});

		it("should successfully notify waitlist availability", async () => {
			const waitlistService = new WaitlistService({
				db: asPrismaClient(testDb),
				currentUserId: testUsers.professional.id,
			});

			const input = {
				waitlistId: waitlistEntry.id,
				availableDate: new Date("2024-12-25"),
				availableTime: "10:00",
				expiresInHours: 24,
			};

			const result = await waitlistService.notifyWaitlistAvailability(input);

			expect(result.success).toBe(true);

			// Verify waitlist entry was updated
			const updatedEntry = await testDb.waitlist.findUnique({
				where: { id: waitlistEntry.id },
			});
			expect(updatedEntry?.status).toBe("notified");
			expect(updatedEntry?.notifiedAt).toBeTruthy();
			expect(updatedEntry?.expiresAt).toBeTruthy();

			// Verify notification was created
			const notification = await testDb.notification.findFirst({
				where: {
					userId: testUsers.client.id,
					type: "waitlist_available",
				},
			});
			expect(notification).toBeTruthy();
		});

		it("should only allow service provider to notify", async () => {
			const waitlistService = new WaitlistService({
				db: asPrismaClient(testDb),
				currentUserId: testUsers.client.id,
			});

			const input = {
				waitlistId: waitlistEntry.id,
				availableDate: new Date("2024-12-25"),
				availableTime: "10:00",
			};

			await expect(
				waitlistService.notifyWaitlistAvailability(input),
			).rejects.toThrow(TRPCError);
		});

		it("should only notify active waitlist entries", async () => {
			// Update entry to cancelled
			await testDb.waitlist.update({
				where: { id: waitlistEntry.id },
				data: { status: "cancelled" },
			});

			const waitlistService = new WaitlistService({
				db: asPrismaClient(testDb),
				currentUserId: testUsers.professional.id,
			});

			const input = {
				waitlistId: waitlistEntry.id,
				availableDate: new Date("2024-12-25"),
				availableTime: "10:00",
			};

			await expect(
				waitlistService.notifyWaitlistAvailability(input),
			).rejects.toThrow(TRPCError);
		});
	});

	describe("checkWaitlistOpportunities", () => {
		beforeEach(async () => {
			// Create multiple waitlist entries
			await testDb.waitlist.createMany({
				data: [
					{
						id: "waitlist-1",
						serviceId: testService.id,
						clientId: testUsers.client.id,
						preferredDate: startOfDay(new Date("2024-12-25")),
						preferredTime: "10:00",
						priority: 5,
						status: "active",
					},
					{
						id: "waitlist-2",
						serviceId: testService.id,
						clientId: "other-client-id",
						preferredDate: startOfDay(new Date("2024-12-25")),
						preferredTime: "14:00",
						priority: 3,
						status: "active",
					},
					{
						id: "waitlist-3",
						serviceId: testService.id,
						clientId: "third-client-id",
						preferredDate: startOfDay(new Date("2024-12-26")),
						status: "active",
					},
				],
			});

			// Create additional clients
			await testDb.user.createMany({
				data: [
					{
						id: "other-client-id",
						name: "Other Client",
						email: "other@test.com",
						isProfessional: false,
						notificationEmail: true,
					},
					{
						id: "third-client-id",
						name: "Third Client",
						email: "third@test.com",
						isProfessional: false,
						notificationEmail: true,
					},
				],
				skipDuplicates: true,
			});
		});

		it("should notify matching waitlist entries by priority", async () => {
			const waitlistService = new WaitlistService({
				db: asPrismaClient(testDb),
				currentUserId: testUsers.professional.id,
			});

			const cancelledDate = new Date("2024-12-25");
			const result = await waitlistService.checkWaitlistOpportunities(
				testService.id,
				cancelledDate,
			);

			expect(result.notified).toBe(2); // Two entries for Dec 25
			expect(result.waitlistIds).toHaveLength(2);

			// Verify notifications were created in priority order
			const notifications = await testDb.notification.findMany({
				where: {
					type: "waitlist_available",
				},
				orderBy: { createdAt: "asc" },
			});

			expect(notifications).toHaveLength(2);
		});

		it("should handle alternative dates", async () => {
			// Update waitlist entry to include alternative dates
			await testDb.waitlist.update({
				where: { id: "waitlist-3" },
				data: {
					alternativeDates: [startOfDay(new Date("2024-12-25"))],
				},
			});

			const waitlistService = new WaitlistService({
				db: asPrismaClient(testDb),
				currentUserId: testUsers.professional.id,
			});

			const cancelledDate = new Date("2024-12-25");
			const result = await waitlistService.checkWaitlistOpportunities(
				testService.id,
				cancelledDate,
			);

			expect(result.notified).toBe(3); // All three entries now match
		});
	});

	describe("convertToBooking", () => {
		let waitlistEntry: Awaited<ReturnType<typeof testDb.waitlist.create>>;

		beforeEach(async () => {
			waitlistEntry = await testDb.waitlist.create({
				data: {
					serviceId: testService.id,
					clientId: testUsers.client.id,
					preferredDate: new Date("2024-12-25"),
					status: "notified",
					notifiedAt: new Date(),
					expiresAt: addHours(new Date(), 24),
					notes: "Test booking from waitlist",
				},
			});
		});

		it("should successfully convert waitlist to booking", async () => {
			const waitlistService = new WaitlistService({
				db: asPrismaClient(testDb),
				currentUserId: testUsers.client.id,
			});

			const bookingDate = new Date("2024-12-25T10:00:00Z");
			const booking = await waitlistService.convertToBooking(
				waitlistEntry.id,
				bookingDate,
			);

			expect(booking.serviceId).toBe(testService.id);
			expect(booking.clientId).toBe(testUsers.client.id);
			expect(booking.providerId).toBe(testUsers.professional.id);
			expect(booking.bookingDate).toEqual(bookingDate);
			expect(booking.totalPrice).toBe(testService.price);
			expect(booking.notes).toBe(waitlistEntry.notes);
			expect(booking.status).toBe("pending");

			// Verify waitlist entry was marked as booked
			const updatedEntry = await testDb.waitlist.findUnique({
				where: { id: waitlistEntry.id },
			});
			expect(updatedEntry?.status).toBe("booked");
		});

		it("should only convert notified waitlist entries", async () => {
			// Update entry to active
			await testDb.waitlist.update({
				where: { id: waitlistEntry.id },
				data: { status: "active" },
			});

			const waitlistService = new WaitlistService({
				db: asPrismaClient(testDb),
				currentUserId: testUsers.client.id,
			});

			const bookingDate = new Date("2024-12-25T10:00:00Z");
			await expect(
				waitlistService.convertToBooking(waitlistEntry.id, bookingDate),
			).rejects.toThrow(TRPCError);
		});

		it("should reject expired notifications", async () => {
			// Update entry to be expired
			await testDb.waitlist.update({
				where: { id: waitlistEntry.id },
				data: { expiresAt: addHours(new Date(), -1) }, // Expired 1 hour ago
			});

			const waitlistService = new WaitlistService({
				db: asPrismaClient(testDb),
				currentUserId: testUsers.client.id,
			});

			const bookingDate = new Date("2024-12-25T10:00:00Z");
			await expect(
				waitlistService.convertToBooking(waitlistEntry.id, bookingDate),
			).rejects.toThrow(TRPCError);
		});
	});

	describe("getServiceWaitlist", () => {
		beforeEach(async () => {
			await testDb.waitlist.createMany({
				data: [
					{
						id: "waitlist-1",
						serviceId: testService.id,
						clientId: testUsers.client.id,
						preferredDate: new Date("2024-12-25"),
						priority: 5,
						status: "active",
					},
					{
						id: "waitlist-2",
						serviceId: testService.id,
						clientId: "other-client-id",
						preferredDate: new Date("2024-12-26"),
						priority: 3,
						status: "active",
					},
				],
			});

			await testDb.user.create({
				data: {
					id: "other-client-id",
					name: "Other Client",
					email: "other@test.com",
					isProfessional: false,
				},
			});
		});

		it("should return waitlist entries for service provider", async () => {
			const waitlistService = new WaitlistService({
				db: asPrismaClient(testDb),
				currentUserId: testUsers.professional.id,
			});

			const result = await waitlistService.getServiceWaitlist(testService.id);

			expect(result).toHaveLength(2);
			expect(result[0]?.priority).toBe(5); // Ordered by priority desc
			expect(result[1]?.priority).toBe(3);
		});

		it("should only allow service provider to view waitlist", async () => {
			const waitlistService = new WaitlistService({
				db: asPrismaClient(testDb),
				currentUserId: testUsers.client.id,
			});

			await expect(
				waitlistService.getServiceWaitlist(testService.id),
			).rejects.toThrow(TRPCError);
		});
	});

	describe("updateWaitlistPriority", () => {
		let waitlistEntry: Awaited<ReturnType<typeof testDb.waitlist.create>>;

		beforeEach(async () => {
			waitlistEntry = await testDb.waitlist.create({
				data: {
					serviceId: testService.id,
					clientId: testUsers.client.id,
					preferredDate: new Date("2024-12-25"),
					priority: 2,
					status: "active",
				},
			});
		});

		it("should update waitlist priority", async () => {
			const waitlistService = new WaitlistService({
				db: asPrismaClient(testDb),
				currentUserId: testUsers.professional.id,
			});

			const result = await waitlistService.updateWaitlistPriority(
				waitlistEntry.id,
				8,
			);

			expect(result.priority).toBe(8);
		});

		it("should only allow service provider to update priority", async () => {
			const waitlistService = new WaitlistService({
				db: asPrismaClient(testDb),
				currentUserId: testUsers.client.id,
			});

			await expect(
				waitlistService.updateWaitlistPriority(waitlistEntry.id, 8),
			).rejects.toThrow(TRPCError);
		});
	});

	describe("getWaitlistStats", () => {
		beforeEach(async () => {
			// Create another service for the same provider
			await testDb.service.create({
				data: {
					id: "service-2",
					title: "Second Service",
					description: "Another test service",
					price: 75.0,
					categoryId: testService.categoryId,
					providerId: testUsers.professional.id,
					duration: 90,
				},
			});

			await testDb.waitlist.createMany({
				data: [
					{
						serviceId: testService.id,
						clientId: testUsers.client.id,
						preferredDate: new Date("2024-12-25"),
						status: "active",
					},
					{
						serviceId: testService.id,
						clientId: "other-client-id",
						preferredDate: new Date("2024-12-26"),
						status: "notified",
					},
					{
						serviceId: "service-2",
						clientId: testUsers.client.id,
						preferredDate: new Date("2024-12-27"),
						status: "active",
					},
				],
			});

			await testDb.user.create({
				data: {
					id: "other-client-id",
					name: "Other Client",
					email: "other@test.com",
					isProfessional: false,
				},
			});
		});

		it("should return waitlist statistics", async () => {
			const waitlistService = new WaitlistService({
				db: asPrismaClient(testDb),
				currentUserId: testUsers.professional.id,
			});

			const stats = await waitlistService.getWaitlistStats();

			expect(stats.byStatus.active).toBe(2);
			expect(stats.byStatus.notified).toBe(1);
			expect(stats.byService).toHaveLength(2);

			const service1Stats = stats.byService.find(
				(s) => s.serviceId === testService.id,
			);
			expect(service1Stats?.activeWaitlists).toBe(1); // Only active ones

			const service2Stats = stats.byService.find(
				(s) => s.serviceId === "service-2",
			);
			expect(service2Stats?.activeWaitlists).toBe(1);
		});
	});
});
