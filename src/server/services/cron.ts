import type { User } from "@prisma/client";
import { db } from "~/server/db";
import { createEscrowService } from "~/server/services/escrow-service";

// Automated task service for handling scheduled operations

// Release escrow funds (run daily)
export async function releaseEscrowFunds() {
	console.log("Starting escrow funds release task...");

	try {
		// Create escrow service for system user (cron job)
		const escrowService = createEscrowService({
			db,
			// System user context for cron jobs
			currentUser: {
				id: "system",
				email: "system@marketplace.com",
				isProfessional: false,
				phone: null,
			} as User,
		});

		const result = await escrowService.processEscrowReleases({});
		console.log(
			`Escrow release completed: ${result.released} successful, ${result.errors} errors`,
		);

		return result;
	} catch (error) {
		console.error("Error in escrow funds release task:", error);
		return { released: 0, errors: 1 };
	}
}

// Clean up old notifications (run weekly)
export async function cleanupOldNotifications() {
	console.log("Starting notification cleanup task...");

	try {
		const sixMonthsAgo = new Date();
		sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

		// Delete read notifications older than 6 months
		const result = await db.notification.deleteMany({
			where: {
				read: true,
				createdAt: {
					lt: sixMonthsAgo,
				},
			},
		});

		console.log(`Deleted ${result.count} old notifications`);
	} catch (error) {
		console.error("Error in notification cleanup task:", error);
	}
}

// Send booking reminders (run daily)
export async function sendBookingReminders() {
	console.log("Starting booking reminders task...");

	try {
		const tomorrow = new Date();
		tomorrow.setDate(tomorrow.getDate() + 1);
		tomorrow.setHours(0, 0, 0, 0);

		const dayAfterTomorrow = new Date(tomorrow);
		dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

		// Find bookings scheduled for tomorrow
		const upcomingBookings = await db.booking.findMany({
			where: {
				status: "accepted",
				bookingDate: {
					gte: tomorrow,
					lt: dayAfterTomorrow,
				},
			},
			include: {
				client: true,
				provider: true,
				service: true,
			},
		});

		console.log(`Found ${upcomingBookings.length} bookings for tomorrow`);

		for (const booking of upcomingBookings) {
			try {
				// Create reminder notification for client
				await db.notification.create({
					data: {
						userId: booking.clientId,
						type: "booking_reminder",
						title: "Booking Reminder",
						message: `Your booking for "${booking.service.title}" is scheduled for tomorrow at ${booking.bookingDate.toLocaleTimeString()}`,
					},
				});

				// Create reminder notification for provider
				await db.notification.create({
					data: {
						userId: booking.providerId,
						type: "booking_reminder",
						title: "Booking Reminder",
						message: `You have a booking for "${booking.service.title}" scheduled for tomorrow at ${booking.bookingDate.toLocaleTimeString()}`,
					},
				});

				console.log(`Sent reminders for booking ${booking.id}`);
			} catch (error) {
				console.error(
					`Failed to send reminder for booking ${booking.id}:`,
					error,
				);
			}
		}

		console.log("Booking reminders task completed");
	} catch (error) {
		console.error("Error in booking reminders task:", error);
	}
}

// Update service ratings (run daily)
export async function updateServiceRatings() {
	console.log("Starting service ratings update task...");

	try {
		// Get all services with reviews
		const services = await db.service.findMany({
			where: {
				reviews: {
					some: {},
				},
			},
			include: {
				reviews: true,
			},
		});

		console.log(`Updating ratings for ${services.length} services`);

		for (const service of services) {
			try {
				// Calculate average rating
				const avgRating =
					service.reviews.reduce((sum, review) => sum + review.rating, 0) /
					service.reviews.length;

				// Update service rating
				await db.service.update({
					where: { id: service.id },
					data: { avgRating },
				});

				console.log(
					`Updated rating for service ${service.id}: ${avgRating.toFixed(2)}`,
				);
			} catch (error) {
				console.error(
					`Failed to update rating for service ${service.id}:`,
					error,
				);
			}
		}

		console.log("Service ratings update task completed");
	} catch (error) {
		console.error("Error in service ratings update task:", error);
	}
}

// Cancel expired pending bookings (run hourly)
export async function cancelExpiredBookings() {
	console.log("Starting expired bookings cancellation task...");

	try {
		const oneDayAgo = new Date();
		oneDayAgo.setDate(oneDayAgo.getDate() - 1);

		// Find pending bookings older than 24 hours
		const expiredBookings = await db.booking.findMany({
			where: {
				status: "pending",
				createdAt: {
					lt: oneDayAgo,
				},
			},
			include: {
				client: true,
				service: true,
				payment: true,
			},
		});

		console.log(`Found ${expiredBookings.length} expired pending bookings`);

		for (const booking of expiredBookings) {
			try {
				await db.$transaction(async (tx) => {
					// Cancel booking
					await tx.booking.update({
						where: { id: booking.id },
						data: {
							status: "cancelled",
							cancellationReason:
								"Automatically cancelled - provider did not respond within 24 hours",
							cancelledBy: "system",
						},
					});

					// Update payment status if exists
					if (booking.payment) {
						await tx.payment.update({
							where: { id: booking.payment.id },
							data: {
								status: "refunded",
								refundAmount: booking.payment.amount,
								refundedAt: new Date(),
							},
						});
					}

					// Create notification for client
					await tx.notification.create({
						data: {
							userId: booking.clientId,
							type: "booking_auto_cancelled",
							title: "Booking Cancelled",
							message: `Your booking for "${booking.service.title}" was automatically cancelled because the provider did not respond within 24 hours. You will receive a full refund.`,
						},
					});

					// Decrement service booking count
					await tx.service.update({
						where: { id: booking.serviceId },
						data: { bookingCount: { decrement: 1 } },
					});
				});

				console.log(`Cancelled expired booking ${booking.id}`);
			} catch (error) {
				console.error(`Failed to cancel booking ${booking.id}:`, error);
			}
		}

		console.log("Expired bookings cancellation task completed");
	} catch (error) {
		console.error("Error in expired bookings cancellation task:", error);
	}
}

// Generate service embeddings for new services (run daily)
export async function generateServiceEmbeddings() {
	console.log("Starting service embeddings generation task...");

	try {
		// Find services without embeddings
		const servicesWithoutEmbeddings = await db.service.findMany({
			where: {
				embedding: {
					isEmpty: true,
				},
			},
			include: {
				category: true,
			},
			take: 50, // Process 50 services at a time
		});

		console.log(
			`Found ${servicesWithoutEmbeddings.length} services without embeddings`,
		);

		// Import embedding service
		const { embedService } = await import("~/server/services/embeddings");

		for (const service of servicesWithoutEmbeddings) {
			try {
				// Generate embedding
				const embedding = await embedService({
					title: service.title,
					description: service.description,
					category: service.category,
				});

				// Update service with embedding
				await db.service.update({
					where: { id: service.id },
					data: { embedding },
				});

				console.log(
					`Generated embedding for service ${service.id}: ${service.title}`,
				);
			} catch (error) {
				console.error(
					`Failed to generate embedding for service ${service.id}:`,
					error,
				);
			}
		}

		console.log("Service embeddings generation task completed");
	} catch (error) {
		console.error("Error in service embeddings generation task:", error);
	}
}

// Run all scheduled tasks
export async function runScheduledTasks() {
	console.log("Running scheduled tasks...");

	// Run different tasks based on frequency
	const now = new Date();
	const hour = now.getHours();
	const dayOfWeek = now.getDay();

	// Hourly tasks
	await cancelExpiredBookings();

	// Daily tasks (run at 2 AM)
	if (hour === 2) {
		await releaseEscrowFunds();
		await sendBookingReminders();
		await updateServiceRatings();
		await generateServiceEmbeddings();
	}

	// Weekly tasks (run on Sunday at 3 AM)
	if (dayOfWeek === 0 && hour === 3) {
		await cleanupOldNotifications();
	}

	console.log("Scheduled tasks completed");
}
