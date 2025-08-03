import type { Prisma, PrismaClient } from "@prisma/client";
import { addDays, endOfDay, startOfDay } from "date-fns";

/**
 * Query Optimization Service
 *
 * This service provides optimized database queries that leverage
 * the performance indexes and efficient query patterns for the
 * services marketplace application.
 */

interface QueryOptimizationServiceDeps {
	db: PrismaClient;
}

export class QueryOptimizationService {
	constructor(private deps: QueryOptimizationServiceDeps) {}

	/**
	 * Optimized service search with efficient filtering and pagination
	 */
	async searchServices({
		query,
		categoryId,
		minPrice,
		maxPrice,
		minRating,
		location,
		providerId,
		limit = 20,
		cursor,
	}: {
		query?: string;
		categoryId?: string;
		minPrice?: number;
		maxPrice?: number;
		minRating?: number;
		location?: string;
		providerId?: string;
		limit?: number;
		cursor?: string;
	}) {
		const where: Prisma.ServiceWhereInput = {
			status: "active", // Use index: status, categoryId, avgRating, price
		};

		if (categoryId) {
			where.categoryId = categoryId;
		}

		if (minPrice !== undefined || maxPrice !== undefined) {
			where.price = {};
			if (minPrice !== undefined) where.price.gte = minPrice;
			if (maxPrice !== undefined) where.price.lte = maxPrice;
		}

		if (minRating !== undefined) {
			where.avgRating = { gte: minRating };
		}

		if (location) {
			where.location = { contains: location, mode: "insensitive" };
		}

		if (providerId) {
			where.providerId = providerId;
		}

		if (query) {
			where.OR = [
				{ title: { contains: query, mode: "insensitive" } },
				{ description: { contains: query, mode: "insensitive" } },
			];
		}

		const services = await this.deps.db.service.findMany({
			where,
			take: limit + 1,
			cursor: cursor ? { id: cursor } : undefined,
			orderBy: [
				{ avgRating: "desc" }, // Use index for rating-based ordering
				{ bookingCount: "desc" },
				{ createdAt: "desc" },
			],
			include: {
				category: { select: { id: true, name: true } },
				provider: {
					select: {
						id: true,
						name: true,
						image: true,
						city: true,
						state: true,
					},
				},
				images: { take: 3 },
				_count: {
					select: {
						bookings: {
							where: { status: "completed" },
						},
						reviews: true,
					},
				},
			},
		});

		const hasMore = services.length > limit;
		if (hasMore) services.pop();

		return {
			services,
			nextCursor: hasMore ? services[services.length - 1]?.id : null,
		};
	}

	/**
	 * Optimized booking conflict checking
	 */
	async checkBookingConflicts({
		serviceId,
		date,
		startTime,
		endTime,
		excludeBookingId,
	}: {
		serviceId: string;
		date: Date;
		startTime?: Date;
		endTime?: Date;
		excludeBookingId?: string;
	}) {
		const dayStart = startOfDay(date);
		const dayEnd = endOfDay(date);

		const where: Prisma.BookingWhereInput = {
			serviceId,
			bookingDate: {
				gte: dayStart,
				lte: dayEnd,
			},
			status: { in: ["pending", "accepted"] }, // Use composite index
		};

		if (excludeBookingId) {
			where.id = { not: excludeBookingId };
		}

		if (startTime && endTime) {
			// Check for time overlaps using the available booking fields
			where.OR = [
				{
					bookingDate: { lte: startTime },
					endDate: { gte: startTime },
				},
				{
					bookingDate: { lte: endTime },
					endDate: { gte: endTime },
				},
				{
					bookingDate: { gte: startTime },
					endDate: { lte: endTime },
				},
			];
		}

		return await this.deps.db.booking.count({ where });
	}

	/**
	 * Optimized provider dashboard data with parallel queries
	 */
	async getProviderDashboardData(
		providerId: string,
		dateRange: { from: Date; to: Date },
	) {
		// Execute all queries in parallel for better performance
		const [
			bookingStats,
			earningsData,
			recentBookings,
			serviceStats,
			upcomingBookings,
		] = await Promise.all([
			// Booking statistics
			this.deps.db.booking.groupBy({
				by: ["status"],
				where: {
					providerId,
					createdAt: { gte: dateRange.from, lte: dateRange.to },
				},
				_count: true,
			}),

			// Earnings data - use composite index on payment status
			this.deps.db.payment.aggregate({
				where: {
					booking: { providerId },
					status: "paid",
					createdAt: { gte: dateRange.from, lte: dateRange.to },
				},
				_sum: { netAmount: true },
				_count: true,
			}),

			// Recent bookings - use optimized index
			this.deps.db.booking.findMany({
				where: {
					providerId,
					status: { in: ["pending", "accepted", "completed"] },
				},
				take: 10,
				orderBy: { createdAt: "desc" }, // Use index
				include: {
					service: { select: { title: true } },
					client: { select: { name: true, image: true } },
				},
			}),

			// Service performance
			this.deps.db.service.findMany({
				where: { providerId, status: "active" },
				select: {
					id: true,
					title: true,
					bookingCount: true,
					avgRating: true,
					viewCount: true,
				},
				orderBy: { bookingCount: "desc" },
				take: 5,
			}),

			// Upcoming bookings - use composite index
			this.deps.db.booking.findMany({
				where: {
					providerId,
					status: "accepted",
					bookingDate: { gte: new Date() },
				},
				take: 5,
				orderBy: { bookingDate: "asc" },
				include: {
					service: { select: { title: true } },
					client: { select: { name: true, image: true } },
				},
			}),
		]);

		return {
			bookingStats: bookingStats.reduce(
				(acc, stat) => {
					acc[stat.status] = stat._count;
					return acc;
				},
				{} as Record<string, number>,
			),
			earnings: {
				total: earningsData._sum.netAmount || 0,
				count: earningsData._count,
			},
			recentBookings,
			topServices: serviceStats,
			upcomingBookings,
		};
	}

	/**
	 * Optimized availability checking for providers
	 */
	async getProviderAvailability(
		providerId: string,
		startDate: Date,
		endDate: Date,
	) {
		// Use optimized composite index: providerId, date, isBooked
		const busySlots = await this.deps.db.timeSlot.findMany({
			where: {
				providerId,
				date: { gte: startDate, lte: endDate },
				isBooked: true,
			},
			select: {
				date: true,
				startTime: true,
				endTime: true,
				serviceId: true,
			},
			orderBy: [{ date: "asc" }, { startTime: "asc" }],
		});

		// Get provider's general availability
		const availability = await this.deps.db.availability.findMany({
			where: { providerId, isActive: true },
			orderBy: { dayOfWeek: "asc" },
		});

		return { busySlots, availability };
	}

	/**
	 * Optimized conversation list with unread counts
	 */
	async getUserConversations(userId: string, limit = 20, cursor?: string) {
		// Use optimized indexes for participant lookups
		const conversations = await this.deps.db.conversation.findMany({
			where: {
				OR: [{ participantOneId: userId }, { participantTwoId: userId }],
			},
			take: limit + 1,
			cursor: cursor ? { id: cursor } : undefined,
			orderBy: { lastMessageAt: "desc" }, // Use index
			include: {
				participantOne: {
					select: { id: true, name: true, image: true },
				},
				participantTwo: {
					select: { id: true, name: true, image: true },
				},
				messages: {
					take: 1,
					orderBy: { createdAt: "desc" },
					select: { content: true, createdAt: true, senderId: true },
				},
				_count: {
					select: {
						messages: {
							where: {
								isRead: false,
								senderId: { not: userId },
							},
						},
					},
				},
			},
		});

		const hasMore = conversations.length > limit;
		if (hasMore) conversations.pop();

		return {
			conversations: conversations.map((conv) => ({
				...conv,
				otherParticipant:
					conv.participantOneId === userId
						? conv.participantTwo
						: conv.participantOne,
				lastMessage: conv.messages[0] || null,
				unreadCount: conv._count.messages,
			})),
			nextCursor: hasMore ? conversations[conversations.length - 1]?.id : null,
		};
	}

	/**
	 * Optimized search for recurring bookings
	 */
	async getRecurringBookings({
		clientId,
		providerId,
		status,
		limit = 20,
		cursor,
	}: {
		clientId?: string;
		providerId?: string;
		status?: string;
		limit?: number;
		cursor?: string;
	}) {
		const where: {
			clientId?: string;
			providerId?: string;
			status?: string;
		} = {};

		if (clientId) {
			where.clientId = clientId;
		}

		if (providerId) {
			where.providerId = providerId;
		}

		if (status) {
			where.status = status;
		}

		// Use optimized composite indexes based on query pattern
		const orderBy: Prisma.RecurringBookingOrderByWithRelationInput[] = clientId
			? [{ frequency: "asc" }, { createdAt: "desc" }] // Use clientId, frequency, createdAt index
			: [{ frequency: "asc" }, { createdAt: "desc" }]; // Use providerId, frequency, createdAt index

		const recurringBookings = await this.deps.db.recurringBooking.findMany({
			where,
			take: limit + 1,
			cursor: cursor ? { id: cursor } : undefined,
			orderBy,
			include: {
				service: {
					select: { id: true, title: true, price: true },
				},
				client: {
					select: { id: true, name: true, image: true },
				},
				provider: {
					select: { id: true, name: true, image: true },
				},
				_count: {
					select: {
						bookings: {
							where: { status: { notIn: ["cancelled", "declined"] } },
						},
					},
				},
			},
		});

		const hasMore = recurringBookings.length > limit;
		if (hasMore) recurringBookings.pop();

		return {
			recurringBookings,
			nextCursor: hasMore
				? recurringBookings[recurringBookings.length - 1]?.id
				: null,
		};
	}

	/**
	 * Bulk operations for performance
	 */
	async batchUpdateServiceMetrics(serviceIds: string[]) {
		// Update service metrics in batches for better performance
		const BATCH_SIZE = 100;
		const results = [];

		for (let i = 0; i < serviceIds.length; i += BATCH_SIZE) {
			const batch = serviceIds.slice(i, i + BATCH_SIZE);

			const batchPromises = batch.map(async (serviceId) => {
				const [bookingCount, avgRating] = await Promise.all([
					this.deps.db.booking.count({
						where: { serviceId, status: "completed" },
					}),
					this.deps.db.review.aggregate({
						where: { serviceId },
						_avg: { rating: true },
					}),
				]);

				return this.deps.db.service.update({
					where: { id: serviceId },
					data: {
						bookingCount,
						avgRating: avgRating._avg.rating,
					},
				});
			});

			const batchResults = await Promise.all(batchPromises);
			results.push(...batchResults);
		}

		return results;
	}

	/**
	 * Get analytics data with optimized aggregations
	 */
	async getAnalyticsData(
		providerId: string,
		period: "day" | "week" | "month",
		startDate: Date,
		endDate: Date,
	) {
		// Use indexes for efficient date range queries
		const [bookingTrends, revenueTrends, servicePerformance] =
			await Promise.all([
				// Booking trends over time
				this.deps.db.booking.groupBy({
					by: ["status"],
					where: {
						providerId,
						createdAt: { gte: startDate, lte: endDate },
					},
					_count: true,
				}),

				// Revenue trends
				this.deps.db.payment.groupBy({
					by: ["status"],
					where: {
						booking: { providerId },
						createdAt: { gte: startDate, lte: endDate },
					},
					_sum: { netAmount: true },
					_count: true,
				}),

				// Service performance
				this.deps.db.service.findMany({
					where: { providerId },
					select: {
						id: true,
						title: true,
						bookingCount: true,
						avgRating: true,
						viewCount: true,
						_count: {
							select: {
								bookings: {
									where: {
										status: "completed",
										completedAt: { gte: startDate, lte: endDate },
									},
								},
							},
						},
					},
					orderBy: { bookingCount: "desc" },
				}),
			]);

		return {
			bookingTrends,
			revenueTrends,
			servicePerformance,
		};
	}
}

// Factory function for easy instantiation
export const createQueryOptimizationService = (
	deps: QueryOptimizationServiceDeps,
) => new QueryOptimizationService(deps);
