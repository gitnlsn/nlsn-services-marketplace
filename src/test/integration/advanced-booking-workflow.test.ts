import { addDays, addWeeks } from "date-fns";
import { beforeEach, describe, expect, it } from "vitest";
import { BookingReminderService } from "~/server/services/booking-reminder-service";
import { createBookingService } from "~/server/services/booking-service";
import { GroupBookingService } from "~/server/services/group-booking-service";
import { RecurringBookingService } from "~/server/services/recurring-booking-service";
import { ServiceBundleService } from "~/server/services/service-bundle-service";
import { WaitlistService } from "~/server/services/waitlist-service";
import {
	cleanupTestDatabase,
	setupTestDatabase,
	testCategory,
	testDb,
	testService,
	testUsers,
} from "../setup";
import { asPrismaClient } from "../types";

describe("Advanced Booking Workflow Integration Tests", () => {
	let secondService: Awaited<ReturnType<typeof testDb.service.create>>;
	let serviceAddOn: Awaited<ReturnType<typeof testDb.serviceAddOn.create>>;

	beforeEach(async () => {
		await cleanupTestDatabase();
		await setupTestDatabase();

		// Create additional test services and data
		secondService = await testDb.service.create({
			data: {
				id: "second-service-id",
				title: "Complementary Service",
				description: "A service that complements the main service",
				price: 75.0,
				priceType: "fixed",
				categoryId: testCategory.id,
				providerId: testUsers.professional.id,
				duration: 90,
				location: "Secondary Location",
				status: "active",
				bufferTime: 30, // 30 minutes buffer
			},
		});

		// Create service add-on
		serviceAddOn = await testDb.serviceAddOn.create({
			data: {
				id: "addon-1",
				serviceId: testService.id,
				name: "Premium Materials",
				description: "High-quality materials upgrade",
				price: 25.0,
				isActive: true,
			},
		});

		// Create additional test users
		await testDb.user.createMany({
			data: [
				{
					id: "client-2",
					name: "Second Client",
					email: "client2@test.com",
					isProfessional: false,
					notificationEmail: true,
					phone: "+5511999999998",
				},
				{
					id: "client-3",
					name: "Third Client",
					email: "client3@test.com",
					isProfessional: false,
					notificationEmail: true,
					phone: "+5511999999997",
				},
			],
			skipDuplicates: true,
		});

		// Update test users with contact info
		await testDb.user.updateMany({
			where: {
				id: { in: [testUsers.client.id, testUsers.professional.id] },
			},
			data: {
				email: "test@example.com",
				phone: "+5511999999999",
				notificationEmail: true,
				notificationSms: true,
			},
		});
	});

	describe("Service Bundle with Add-ons Workflow", () => {
		it("should create and book a service bundle with add-ons", async () => {
			// Step 1: Create a service bundle
			const bundleService = new ServiceBundleService({
				db: asPrismaClient(testDb),
				currentUserId: testUsers.professional.id,
			});

			const bundle = await bundleService.createBundle({
				name: "Wellness Package",
				description: "Complete wellness solution",
				serviceIds: [testService.id, secondService.id],
				discount: 20,
				validFrom: new Date("2024-12-01"),
				validUntil: new Date("2024-12-31"),
				maxUses: 50,
			});

			// Step 2: Create booking with bundle and add-ons
			const bookingService = createBookingService({
				db: asPrismaClient(testDb),
				currentUser: testUsers.client,
				currentUserId: testUsers.client.id,
			});

			const bookingData = {
				serviceId: testService.id,
				bookingDate: new Date("2024-12-25T10:00:00Z"),
				endDate: new Date("2024-12-25T11:00:00Z"),
				bundleId: bundle.id,
				addOnIds: [serviceAddOn.id],
				notes: "Booking with bundle and add-ons",
			};

			const result = await bookingService.createBooking(bookingData);

			// Verify pricing calculation
			const basePrice = testService.price;
			const bundleDiscountedPrice = basePrice * 0.8; // 20% discount
			const totalWithAddOn = bundleDiscountedPrice + serviceAddOn.price;

			expect(result.booking.totalPrice).toBe(totalWithAddOn);

			// Verify add-on was associated
			const bookingAddOns = await testDb.bookingAddOn.findMany({
				where: { bookingId: result.booking.id },
			});
			expect(bookingAddOns).toHaveLength(1);
			expect(bookingAddOns[0]?.addOnId).toBe(serviceAddOn.id);
			expect(bookingAddOns[0]?.price).toBe(serviceAddOn.price);

			// Step 3: Schedule reminders
			const reminderService = new BookingReminderService({
				db: asPrismaClient(testDb),
			});
			await reminderService.scheduleBookingReminders(result.booking.id);

			const reminders = await testDb.bookingReminder.findMany({
				where: { bookingId: result.booking.id },
			});
			expect(reminders.length).toBeGreaterThan(0);

			// Step 4: Accept booking
			const providerBookingService = createBookingService({
				db: asPrismaClient(testDb),
				currentUser: testUsers.professional,
				currentUserId: testUsers.professional.id,
			});

			const acceptedBooking = await providerBookingService.acceptBooking({
				bookingId: result.booking.id,
			});

			expect(acceptedBooking.status).toBe("accepted");

			// Verify buffer time was applied
			const bufferSlots = await testDb.timeSlot.findMany({
				where: {
					serviceId: testService.id,
					date: new Date("2024-12-25"),
					isBooked: true,
				},
			});
			expect(bufferSlots.length).toBeGreaterThan(0);
		});
	});

	describe("Group Booking Workflow", () => {
		it("should create and fill a group booking", async () => {
			// Step 1: Enable group bookings for service
			await testDb.groupBookingSettings.create({
				data: {
					serviceId: testService.id,
					enabled: true,
					maxGroupSize: 3,
					minGroupSize: 2,
					groupDiscount: 15,
				},
			});

			// Step 2: Create group booking
			const groupBookingService = new GroupBookingService({
				db: asPrismaClient(testDb),
				currentUserId: testUsers.client.id,
			});

			const groupBooking = await groupBookingService.createGroupBooking({
				serviceId: testService.id,
				name: "Team Workshop",
				description: "Team building workshop",
				maxParticipants: 3,
				minParticipants: 2,
				bookingDate: new Date("2024-12-25T14:00:00Z"),
				endDate: new Date("2024-12-25T16:00:00Z"),
			});

			expect(groupBooking.groupBooking.status).toBe("open");
			expect(groupBooking.organizerBooking.booking.status).toBe("pending");

			// Step 3: Add participants
			const participant2Service = new GroupBookingService({
				db: asPrismaClient(testDb),
				currentUserId: "client-2",
			});

			const participant3Service = new GroupBookingService({
				db: asPrismaClient(testDb),
				currentUserId: "client-3",
			});

			await participant2Service.joinGroupBooking({
				groupBookingId: groupBooking.groupBooking.id,
				notes: "Excited to join!",
			});

			await participant3Service.joinGroupBooking({
				groupBookingId: groupBooking.groupBooking.id,
				notes: "Looking forward to it!",
			});

			// Verify group is now full and confirmed
			const updatedGroup = await testDb.groupBooking.findUnique({
				where: { id: groupBooking.groupBooking.id },
				include: { bookings: true },
			});

			expect(updatedGroup?.status).toBe("confirmed");
			expect(updatedGroup?.bookings).toHaveLength(3);

			// Step 4: Provider accepts all bookings
			const providerBookingService = createBookingService({
				db: asPrismaClient(testDb),
				currentUser: testUsers.professional,
				currentUserId: testUsers.professional.id,
			});

			if (updatedGroup?.bookings) {
				for (const booking of updatedGroup.bookings) {
					await providerBookingService.acceptBooking({
						bookingId: booking.id,
					});
				}
			}

			// Verify all bookings are accepted
			const acceptedBookings = await testDb.booking.findMany({
				where: {
					groupBookingId: groupBooking.groupBooking.id,
					status: "accepted",
				},
			});
			expect(acceptedBookings).toHaveLength(3);
		});
	});

	describe("Recurring Booking Workflow", () => {
		it("should create and manage recurring bookings", async () => {
			// Step 1: Create recurring booking
			const recurringService = new RecurringBookingService({
				db: asPrismaClient(testDb),
				currentUserId: testUsers.client.id,
			});

			const recurring = await recurringService.createRecurringBooking({
				serviceId: testService.id,
				startDate: new Date("2024-12-25T10:00:00Z"),
				endDate: new Date("2024-12-25T11:00:00Z"),
				frequency: "weekly",
				interval: 1,
				occurrences: 4,
				notes: "Weekly therapy sessions",
				timeSlot: "10:00",
				duration: 60,
			});

			expect(recurring.recurringBooking.status).toBe("active");
			expect(recurring.bookings).toHaveLength(4);

			// Step 2: Provider accepts some bookings
			const providerBookingService = createBookingService({
				db: asPrismaClient(testDb),
				currentUser: testUsers.professional,
				currentUserId: testUsers.professional.id,
			});

			// Accept first two bookings
			const firstRecurringBooking = recurring.bookings[0];
			const secondRecurringBooking = recurring.bookings[1];
			if (!firstRecurringBooking || !secondRecurringBooking) {
				throw new Error("Recurring bookings not found");
			}
			await providerBookingService.acceptBooking({
				bookingId: firstRecurringBooking.booking.id,
			});
			await providerBookingService.acceptBooking({
				bookingId: secondRecurringBooking.booking.id,
			});

			// Step 3: Complete first booking
			await providerBookingService.updateBookingStatus({
				bookingId: firstRecurringBooking.booking.id,
				status: "completed",
			});

			// Step 4: Pause recurring booking
			const updatedRecurring = await recurringService.pauseRecurringBooking(
				recurring.recurringBooking.id,
			);

			expect(updatedRecurring.success).toBe(true);

			// Verify future bookings were cancelled
			const futureBookings = await testDb.booking.findMany({
				where: {
					recurringBookingId: recurring.recurringBooking.id,
					bookingDate: { gte: new Date() },
					status: "cancelled",
				},
			});
			expect(futureBookings.length).toBeGreaterThan(0);

			// Step 5: Resume recurring booking
			const resumedRecurring = await recurringService.resumeRecurringBooking(
				recurring.recurringBooking.id,
				new Date("2025-01-01T10:00:00Z"),
			);

			expect(resumedRecurring.success).toBe(true);
		});
	});

	describe("Waitlist to Booking Conversion Workflow", () => {
		it("should handle waitlist to booking conversion", async () => {
			// Step 1: Service is fully booked
			await testDb.service.update({
				where: { id: testService.id },
				data: { maxBookings: 1 },
			});

			// Create existing booking
			await testDb.booking.create({
				data: {
					id: "existing-booking",
					serviceId: testService.id,
					clientId: "client-2",
					providerId: testUsers.professional.id,
					bookingDate: new Date("2024-12-25T10:00:00Z"),
					totalPrice: testService.price,
					status: "accepted",
				},
			});

			// Step 2: Client tries to book but joins waitlist instead
			const bookingService = createBookingService({
				db: asPrismaClient(testDb),
				currentUser: testUsers.client,
				currentUserId: testUsers.client.id,
			});

			// This should fail due to max bookings
			await expect(
				bookingService.createBooking({
					serviceId: testService.id,
					bookingDate: new Date("2024-12-25T10:00:00Z"),
				}),
			).rejects.toThrow();

			// Join waitlist instead
			const waitlistService = new WaitlistService({
				db: asPrismaClient(testDb),
				currentUserId: testUsers.client.id,
			});

			const waitlistEntry = await waitlistService.joinWaitlist({
				serviceId: testService.id,
				preferredDate: new Date("2024-12-25"),
				preferredTime: "10:00",
				notes: "Please notify me if a spot opens up",
			});

			expect(waitlistEntry.status).toBe("active");

			// Step 3: Original booking gets cancelled
			const originalBookingService = createBookingService({
				db: asPrismaClient(testDb),
				currentUser: testUsers.client,
				currentUserId: "client-2",
			});

			await originalBookingService.updateBookingStatus({
				bookingId: "existing-booking",
				status: "cancelled",
				reason: "Personal emergency",
			});

			// Wait for waitlist processing
			const result = await waitlistService.checkWaitlistOpportunities(
				testService.id,
				new Date("2024-12-25T10:00:00Z"),
			);

			expect(result.notified).toBe(1);

			// Step 4: Notify waitlist and convert to booking
			const providerWaitlistService = new WaitlistService({
				db: asPrismaClient(testDb),
				currentUserId: testUsers.professional.id,
			});

			await providerWaitlistService.notifyWaitlistAvailability({
				waitlistId: waitlistEntry.id,
				availableDate: new Date("2024-12-25"),
				availableTime: "10:00",
				expiresInHours: 24,
			});

			// Convert waitlist to booking
			const booking = await waitlistService.convertToBooking(
				waitlistEntry.id,
				new Date("2024-12-25T10:00:00Z"),
			);

			expect(booking.status).toBe("pending");
			expect(booking.serviceId).toBe(testService.id);
			expect(booking.clientId).toBe(testUsers.client.id);

			// Verify waitlist entry was marked as booked
			const updatedWaitlist = await testDb.waitlist.findUnique({
				where: { id: waitlistEntry.id },
			});
			expect(updatedWaitlist?.status).toBe("booked");
		});
	});

	describe("Complete Booking Lifecycle with Advanced Features", () => {
		it("should handle complete booking lifecycle with all features", async () => {
			// Step 1: Setup service with buffer time and policies
			await testDb.service.update({
				where: { id: testService.id },
				data: { bufferTime: 15 },
			});

			await testDb.bookingPolicy.create({
				data: {
					serviceId: testService.id,
					name: "Standard Cancellation Policy",
					type: "cancellation",
					description: "24 hour cancellation policy with late cancellation fee",
					hoursBeforeBooking: 24,
					penaltyType: "fixed",
					penaltyValue: 25.0,
					allowExceptions: true,
					isActive: true,
				},
			});

			// Step 2: Create bundle with multiple services
			const bundleService = new ServiceBundleService({
				db: asPrismaClient(testDb),
				currentUserId: testUsers.professional.id,
			});

			const bundle = await bundleService.createBundle({
				name: "Premium Package",
				serviceIds: [testService.id, secondService.id],
				discount: 25,
				validFrom: new Date("2024-12-01"),
				validUntil: new Date("2024-12-31"),
			});

			// Step 3: Create recurring booking with bundle
			const recurringService = new RecurringBookingService({
				db: asPrismaClient(testDb),
				currentUserId: testUsers.client.id,
			});

			const recurring = await recurringService.createRecurringBooking({
				serviceId: testService.id,
				startDate: new Date("2024-12-25T10:00:00Z"),
				endDate: new Date("2024-12-25T11:00:00Z"),
				frequency: "weekly",
				interval: 2, // Every 2 weeks
				occurrences: 3,
				timeSlot: "10:00",
				duration: 60,
			});

			// Step 4: Book additional service with add-ons
			const bookingService = createBookingService({
				db: asPrismaClient(testDb),
				currentUser: testUsers.client,
				currentUserId: testUsers.client.id,
			});

			const standaloneBooking = await bookingService.createBooking({
				serviceId: secondService.id,
				bookingDate: new Date("2024-12-27T14:00:00Z"),
				endDate: new Date("2024-12-27T15:30:00Z"),
				bundleId: bundle.id,
				addOnIds: [serviceAddOn.id],
				notes: "Special requirements noted",
			});

			// Step 5: Setup reminders for all bookings
			const reminderService = new BookingReminderService({
				db: asPrismaClient(testDb),
			});

			// Schedule reminders for recurring bookings
			for (const booking of recurring.bookings) {
				await reminderService.scheduleBookingReminders(booking.booking.id);
			}

			// Schedule reminders for standalone booking
			await reminderService.scheduleBookingReminders(
				standaloneBooking.booking.id,
			);

			// Step 6: Provider manages bookings
			const providerBookingService = createBookingService({
				db: asPrismaClient(testDb),
				currentUser: testUsers.professional,
				currentUserId: testUsers.professional.id,
			});

			// Accept all bookings
			for (const booking of recurring.bookings) {
				await providerBookingService.acceptBooking({
					bookingId: booking.booking.id,
				});
			}

			await providerBookingService.acceptBooking({
				bookingId: standaloneBooking.booking.id,
			});

			// Step 7: Complete first recurring booking
			const firstBooking = recurring.bookings[0];
			if (!firstBooking) throw new Error("First booking not found");
			await providerBookingService.updateBookingStatus({
				bookingId: firstBooking.booking.id,
				status: "completed",
			});

			// Step 8: Client cancels one future booking
			const secondBooking = recurring.bookings[1];
			if (!secondBooking) throw new Error("Second booking not found");
			await bookingService.updateBookingStatus({
				bookingId: secondBooking.booking.id,
				status: "cancelled",
				reason: "Schedule conflict",
			});

			// Step 9: Verify final state
			const finalBookings = await testDb.booking.findMany({
				where: {
					OR: [
						{ recurringBookingId: recurring.recurringBooking.id },
						{ id: standaloneBooking.booking.id },
					],
				},
				include: {
					addOns: true,
					remindersSent: true,
				},
			});

			// Verify booking statuses
			const completedBookings = finalBookings.filter(
				(b: (typeof finalBookings)[0]) => b.status === "completed",
			);
			const acceptedBookings = finalBookings.filter(
				(b: (typeof finalBookings)[0]) => b.status === "accepted",
			);
			const cancelledBookings = finalBookings.filter(
				(b: (typeof finalBookings)[0]) => b.status === "cancelled",
			);

			expect(completedBookings).toHaveLength(1);
			expect(acceptedBookings).toHaveLength(2); // 1 recurring + 1 standalone
			expect(cancelledBookings).toHaveLength(1);

			// Verify add-ons were processed
			const bookingWithAddOns = finalBookings.find(
				(b: (typeof finalBookings)[0]) => b.addOns.length > 0,
			);
			expect(bookingWithAddOns?.addOns).toHaveLength(1);

			// Verify reminders were created
			const allReminders = await testDb.bookingReminder.findMany({
				where: {
					bookingId: {
						in: finalBookings.map((b: (typeof finalBookings)[0]) => b.id),
					},
				},
			});
			expect(allReminders.length).toBeGreaterThan(0);

			// Verify buffer times were applied
			const bufferSlots = await testDb.timeSlot.findMany({
				where: { isBooked: true },
			});
			expect(bufferSlots.length).toBeGreaterThan(0);

			// Step 10: Check bundle usage statistics
			const bundleStats = await bundleService.getBundleStats();
			expect(bundleStats.bundles.length).toBeGreaterThan(0);
			expect(bundleStats.totalBundleRevenue).toBeGreaterThan(0);
		});
	});
});
