import type { PrismaClient } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import {
	addDays,
	endOfDay,
	endOfMonth,
	endOfWeek,
	startOfDay,
	startOfMonth,
	startOfWeek,
	subDays,
	subMonths,
	subWeeks,
} from "date-fns";
import { z } from "zod";

/**
 * Analytics Service for comprehensive reporting and insights
 *
 * Provides detailed analytics for providers, services, bookings, payments,
 * and platform-wide metrics for administrators.
 */

// Type definitions for analytics data
type CustomerMetrics = {
	total_customers: bigint;
	new_customers: bigint;
	returning_customers: bigint;
	avg_bookings_per_customer: number;
};

type MonthlyTrend = {
	month: Date;
	total_revenue: number | null;
	platform_fees: number | null;
	payment_count: bigint;
};

type TrendItem = {
	date: string;
	bookings: number;
	revenue: number;
};

type ConversionMetrics = {
	accepted: bigint;
	declined: bigint;
	completed: bigint;
	cancelled: bigint;
	total: bigint;
};

type ResponseTimeMetrics = {
	avg_response_hours: number;
};

// Input schemas
export const getProviderAnalyticsSchema = z.object({
	providerId: z.string().cuid(),
	period: z.enum(["7d", "30d", "90d", "6m", "1y"]).default("30d"),
	startDate: z.date().optional(),
	endDate: z.date().optional(),
});

export const getServiceAnalyticsSchema = z.object({
	serviceId: z.string().cuid(),
	period: z.enum(["7d", "30d", "90d", "6m", "1y"]).default("30d"),
	compareWithPrevious: z.boolean().default(false),
});

export const getPlatformAnalyticsSchema = z.object({
	period: z.enum(["7d", "30d", "90d", "6m", "1y"]).default("30d"),
	breakdown: z.enum(["daily", "weekly", "monthly"]).default("daily"),
});

export const getRevenueAnalyticsSchema = z.object({
	providerId: z.string().cuid().optional(),
	period: z.enum(["7d", "30d", "90d", "6m", "1y"]).default("30d"),
	includeProjections: z.boolean().default(false),
});

export const getBookingAnalyticsSchema = z.object({
	providerId: z.string().cuid().optional(),
	serviceId: z.string().cuid().optional(),
	period: z.enum(["7d", "30d", "90d", "6m", "1y"]).default("30d"),
	groupBy: z.enum(["day", "week", "month", "status", "service"]).default("day"),
});

export const getCustomerAnalyticsSchema = z.object({
	providerId: z.string().cuid().optional(),
	period: z.enum(["7d", "30d", "90d", "6m", "1y"]).default("30d"),
	segment: z.enum(["new", "returning", "churned", "all"]).default("all"),
});

export const getPerformanceMetricsSchema = z.object({
	providerId: z.string().cuid().optional(),
	serviceIds: z.array(z.string().cuid()).optional(),
	period: z.enum(["7d", "30d", "90d", "6m", "1y"]).default("30d"),
});

// Type definitions
export type GetProviderAnalyticsInput = z.infer<
	typeof getProviderAnalyticsSchema
>;
export type GetServiceAnalyticsInput = z.infer<
	typeof getServiceAnalyticsSchema
>;
export type GetPlatformAnalyticsInput = z.infer<
	typeof getPlatformAnalyticsSchema
>;
export type GetRevenueAnalyticsInput = z.infer<
	typeof getRevenueAnalyticsSchema
>;
export type GetBookingAnalyticsInput = z.infer<
	typeof getBookingAnalyticsSchema
>;
export type GetCustomerAnalyticsInput = z.infer<
	typeof getCustomerAnalyticsSchema
>;
export type GetPerformanceMetricsInput = z.infer<
	typeof getPerformanceMetricsSchema
>;

interface AnalyticsServiceDeps {
	db: PrismaClient;
	currentUser?: { id: string; isProfessional?: boolean };
}

export function createAnalyticsService(deps: AnalyticsServiceDeps) {
	const { db, currentUser } = deps;

	// Helper function to get date range
	function getDateRange(period: string, customStart?: Date, customEnd?: Date) {
		const now = new Date();

		if (customStart && customEnd) {
			return { start: startOfDay(customStart), end: endOfDay(customEnd) };
		}

		switch (period) {
			case "7d":
				return { start: startOfDay(subDays(now, 7)), end: endOfDay(now) };
			case "30d":
				return { start: startOfDay(subDays(now, 30)), end: endOfDay(now) };
			case "90d":
				return { start: startOfDay(subDays(now, 90)), end: endOfDay(now) };
			case "6m":
				return { start: startOfDay(subMonths(now, 6)), end: endOfDay(now) };
			case "1y":
				return { start: startOfDay(subMonths(now, 12)), end: endOfDay(now) };
			default:
				return { start: startOfDay(subDays(now, 30)), end: endOfDay(now) };
		}
	}

	// Helper function to get comparison period
	function getComparisonDateRange(start: Date, end: Date) {
		const duration = end.getTime() - start.getTime();
		const comparisonEnd = new Date(start.getTime() - 1);
		const comparisonStart = new Date(comparisonEnd.getTime() - duration);

		return { start: comparisonStart, end: comparisonEnd };
	}

	return {
		/**
		 * Get comprehensive provider analytics
		 */
		async getProviderAnalytics(input: GetProviderAnalyticsInput) {
			const { start, end } = getDateRange(
				input.period,
				input.startDate,
				input.endDate,
			);
			const { start: prevStart, end: prevEnd } = getComparisonDateRange(
				start,
				end,
			);

			// Execute all analytics queries in parallel
			const [
				currentMetrics,
				previousMetrics,
				bookingTrends,
				revenueData,
				servicePerformance,
				customerMetrics,
				topServices,
			] = await Promise.all([
				// Current period metrics
				db.booking.aggregate({
					where: {
						providerId: input.providerId,
						createdAt: { gte: start, lte: end },
					},
					_count: { id: true },
					_sum: { totalPrice: true },
				}),

				// Previous period metrics for comparison
				db.booking.aggregate({
					where: {
						providerId: input.providerId,
						createdAt: { gte: prevStart, lte: prevEnd },
					},
					_count: { id: true },
					_sum: { totalPrice: true },
				}),

				// Booking trends over time
				db.$queryRaw`
          SELECT 
            DATE_TRUNC('day', "createdAt") as date,
            COUNT(*) as bookings,
            SUM("totalPrice") as revenue,
            COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
            COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled
          FROM "Booking"
          WHERE "providerId" = ${input.providerId}
            AND "createdAt" >= ${start}
            AND "createdAt" <= ${end}
          GROUP BY DATE_TRUNC('day', "createdAt")
          ORDER BY date
        `,

				// Revenue data
				db.payment.aggregate({
					where: {
						booking: {
							providerId: input.providerId,
							completedAt: { gte: start, lte: end },
						},
						status: "paid",
					},
					_sum: {
						amount: true,
						netAmount: true,
						serviceFee: true,
					},
					_count: true,
				}),

				// Service performance
				db.service.findMany({
					where: {
						providerId: input.providerId,
						bookings: {
							some: {
								createdAt: { gte: start, lte: end },
							},
						},
					},
					select: {
						id: true,
						title: true,
						price: true,
						avgRating: true,
						_count: {
							select: {
								bookings: {
									where: {
										createdAt: { gte: start, lte: end },
									},
								},
								reviews: true,
							},
						},
					},
					orderBy: {
						bookings: {
							_count: "desc",
						},
					},
					take: 10,
				}),

				// Customer metrics
				db.$queryRaw`
          SELECT 
            COUNT(DISTINCT "clientId") as total_customers,
            COUNT(DISTINCT CASE WHEN client_booking_count = 1 THEN "clientId" END) as new_customers,
            COUNT(DISTINCT CASE WHEN client_booking_count > 1 THEN "clientId" END) as returning_customers,
            AVG(client_booking_count) as avg_bookings_per_customer
          FROM (
            SELECT 
              "clientId",
              COUNT(*) as client_booking_count
            FROM "Booking"
            WHERE "providerId" = ${input.providerId}
              AND "createdAt" >= ${start}
              AND "createdAt" <= ${end}
            GROUP BY "clientId"
          ) client_stats
        `,

				// Top performing services
				db.service.findMany({
					where: { providerId: input.providerId },
					select: {
						id: true,
						title: true,
						price: true,
						avgRating: true,
						bookingCount: true,
						_count: {
							select: {
								reviews: true,
							},
						},
					},
					orderBy: {
						bookingCount: "desc",
					},
					take: 5,
				}),
			]);

			// Calculate growth rates
			const bookingGrowth =
				previousMetrics._count.id > 0
					? ((currentMetrics._count.id - previousMetrics._count.id) /
							previousMetrics._count.id) *
						100
					: currentMetrics._count.id > 0
						? 100
						: 0;

			const revenueGrowth =
				(previousMetrics._sum.totalPrice || 0) > 0
					? (((currentMetrics._sum.totalPrice || 0) -
							(previousMetrics._sum.totalPrice || 0)) /
							(previousMetrics._sum.totalPrice || 0)) *
						100
					: (currentMetrics._sum.totalPrice || 0) > 0
						? 100
						: 0;

			return {
				overview: {
					totalBookings: currentMetrics._count.id,
					totalRevenue: currentMetrics._sum.totalPrice || 0,
					paidRevenue: revenueData._sum.amount || 0,
					netRevenue: revenueData._sum.netAmount || 0,
					platformFees: revenueData._sum.serviceFee || 0,
					bookingGrowth,
					revenueGrowth,
				},
				trends: bookingTrends,
				servicePerformance,
				customerMetrics: (customerMetrics as CustomerMetrics[])[0] || {
					total_customers: BigInt(0),
					new_customers: BigInt(0),
					returning_customers: BigInt(0),
					avg_bookings_per_customer: 0,
				},
				topServices,
				period: input.period,
				dateRange: { start, end },
			};
		},

		/**
		 * Get service-specific analytics
		 */
		async getServiceAnalytics(input: GetServiceAnalyticsInput) {
			const { start, end } = getDateRange(input.period);
			const { start: prevStart, end: prevEnd } = input.compareWithPrevious
				? getComparisonDateRange(start, end)
				: { start, end };

			const [
				currentMetrics,
				previousMetrics,
				bookingsByStatus,
				customerData,
				reviewsData,
				conversionData,
			] = await Promise.all([
				// Current period
				db.booking.aggregate({
					where: {
						serviceId: input.serviceId,
						createdAt: { gte: start, lte: end },
					},
					_count: { id: true },
					_sum: { totalPrice: true },
					_avg: { totalPrice: true },
				}),

				// Previous period (if comparison requested)
				input.compareWithPrevious
					? db.booking.aggregate({
							where: {
								serviceId: input.serviceId,
								createdAt: { gte: prevStart, lte: prevEnd },
							},
							_count: { id: true },
							_sum: { totalPrice: true },
						})
					: null,

				// Bookings by status
				db.booking.groupBy({
					by: ["status"],
					where: {
						serviceId: input.serviceId,
						createdAt: { gte: start, lte: end },
					},
					_count: true,
				}),

				// Customer data
				db.$queryRaw`
          SELECT 
            COUNT(DISTINCT "clientId") as unique_customers,
            COUNT(*) as total_bookings,
            AVG("totalPrice") as avg_booking_value
          FROM "Booking"
          WHERE "serviceId" = ${input.serviceId}
            AND "createdAt" >= ${start}
            AND "createdAt" <= ${end}
        `,

				// Reviews data
				db.review.aggregate({
					where: {
						serviceId: input.serviceId,
						createdAt: { gte: start, lte: end },
					},
					_count: true,
					_avg: { rating: true },
				}),

				// Service views (if tracked)
				db.service.findUnique({
					where: { id: input.serviceId },
					select: {
						viewCount: true,
						bookingCount: true,
					},
				}),
			]);

			const bookingGrowth =
				input.compareWithPrevious && previousMetrics
					? previousMetrics._count.id > 0
						? ((currentMetrics._count.id - previousMetrics._count.id) /
								previousMetrics._count.id) *
							100
						: currentMetrics._count.id > 0
							? 100
							: 0
					: null;

			const conversionRate =
				conversionData?.viewCount && conversionData.viewCount > 0
					? (currentMetrics._count.id / conversionData.viewCount) * 100
					: null;

			return {
				summary: {
					totalBookings: currentMetrics._count.id,
					totalRevenue: currentMetrics._sum.totalPrice || 0,
					averageBookingValue: currentMetrics._avg.totalPrice || 0,
					uniqueCustomers: Number(
						(customerData as CustomerMetrics[])[0]?.total_customers || 0,
					),
					conversionRate,
					bookingGrowth,
				},
				bookingsByStatus: bookingsByStatus.reduce(
					(acc, item) => {
						acc[item.status] = item._count;
						return acc;
					},
					{} as Record<string, number>,
				),
				reviews: {
					totalReviews: reviewsData._count,
					averageRating: reviewsData._avg.rating || 0,
				},
				period: input.period,
				dateRange: { start, end },
			};
		},

		/**
		 * Get platform-wide analytics (admin only)
		 */
		async getPlatformAnalytics(input: GetPlatformAnalyticsInput) {
			if (!currentUser?.isProfessional) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Platform analytics require admin access",
				});
			}

			const { start, end } = getDateRange(input.period);

			const [
				userMetrics,
				serviceMetrics,
				bookingMetrics,
				revenueMetrics,
				topCategories,
				topProviders,
				growthTrends,
			] = await Promise.all([
				// User metrics
				db.user.aggregate({
					where: {
						createdAt: { gte: start, lte: end },
					},
					_count: { id: true },
				}),

				// Service metrics
				db.service.aggregate({
					where: {
						createdAt: { gte: start, lte: end },
					},
					_count: { id: true },
				}),

				// Booking metrics
				db.booking.groupBy({
					by: ["status"],
					where: {
						createdAt: { gte: start, lte: end },
					},
					_count: true,
					_sum: { totalPrice: true },
				}),

				// Revenue metrics
				db.payment.aggregate({
					where: {
						createdAt: { gte: start, lte: end },
						status: "paid",
					},
					_sum: {
						amount: true,
						netAmount: true,
						serviceFee: true,
					},
					_count: true,
				}),

				// Top categories
				db.category.findMany({
					select: {
						id: true,
						name: true,
						_count: {
							select: {
								services: {
									where: {
										bookings: {
											some: {
												createdAt: { gte: start, lte: end },
											},
										},
									},
								},
							},
						},
					},
					orderBy: {
						services: {
							_count: "desc",
						},
					},
					take: 10,
				}),

				// Top providers
				db.user.findMany({
					where: {
						isProfessional: true,
						services: {
							some: {
								bookings: {
									some: {
										createdAt: { gte: start, lte: end },
									},
								},
							},
						},
					},
					select: {
						id: true,
						name: true,
						_count: {
							select: {
								professionalBookings: {
									where: {
										createdAt: { gte: start, lte: end },
									},
								},
							},
						},
					},
					orderBy: {
						professionalBookings: {
							_count: "desc",
						},
					},
					take: 10,
				}),

				// Growth trends by day/week/month
				input.breakdown === "daily"
					? db.$queryRaw`
          SELECT 
            DATE_TRUNC('day', "createdAt") as period,
            COUNT(*) as bookings,
            SUM("totalPrice") as revenue
          FROM "Booking"
          WHERE "createdAt" >= ${start} AND "createdAt" <= ${end}
          GROUP BY DATE_TRUNC('day', "createdAt")
          ORDER BY period
        `
					: input.breakdown === "weekly"
						? db.$queryRaw`
          SELECT 
            DATE_TRUNC('week', "createdAt") as period,
            COUNT(*) as bookings,
            SUM("totalPrice") as revenue
          FROM "Booking"
          WHERE "createdAt" >= ${start} AND "createdAt" <= ${end}
          GROUP BY DATE_TRUNC('week', "createdAt")
          ORDER BY period
        `
						: db.$queryRaw`
          SELECT 
            DATE_TRUNC('month', "createdAt") as period,
            COUNT(*) as bookings,
            SUM("totalPrice") as revenue
          FROM "Booking"
          WHERE "createdAt" >= ${start} AND "createdAt" <= ${end}
          GROUP BY DATE_TRUNC('month', "createdAt")
          ORDER BY period
        `,
			]);

			return {
				overview: {
					totalUsers: userMetrics._count.id,
					totalServices: serviceMetrics._count.id,
					totalBookings: bookingMetrics.reduce(
						(sum, item) => sum + item._count,
						0,
					),
					totalRevenue: revenueMetrics._sum.amount || 0,
					platformRevenue: revenueMetrics._sum.serviceFee || 0,
				},
				bookingsByStatus: bookingMetrics.reduce(
					(acc, item) => {
						acc[item.status] = item._count;
						return acc;
					},
					{} as Record<string, number>,
				),
				topCategories: topCategories.map((cat) => ({
					id: cat.id,
					name: cat.name,
					serviceCount: cat._count.services,
				})),
				topProviders: topProviders.map((provider) => ({
					id: provider.id,
					name: provider.name,
					bookingCount: provider._count.professionalBookings,
				})),
				growthTrends,
				period: input.period,
				breakdown: input.breakdown,
				dateRange: { start, end },
			};
		},

		/**
		 * Get revenue analytics with projections
		 */
		async getRevenueAnalytics(input: GetRevenueAnalyticsInput) {
			const { start, end } = getDateRange(input.period);

			const whereClause = input.providerId
				? { booking: { providerId: input.providerId } }
				: {};

			const [revenueData, monthlyTrends, paymentMethods, refundData] =
				await Promise.all([
					// Revenue summary
					db.payment.aggregate({
						where: {
							...whereClause,
							createdAt: { gte: start, lte: end },
							status: "paid",
						},
						_sum: {
							amount: true,
							netAmount: true,
							serviceFee: true,
						},
						_count: true,
						_avg: { amount: true },
					}),

					// Monthly revenue trends
					db.$queryRaw`
          SELECT 
            DATE_TRUNC('month', p."createdAt") as month,
            SUM(p."amount") as total_revenue,
            SUM(p."netAmount") as net_revenue,
            SUM(p."serviceFee") as platform_fees,
            COUNT(*) as payment_count
          FROM "Payment" p
          ${input.providerId ? `JOIN "Booking" b ON p."bookingId" = b.id` : ""}
          WHERE p."createdAt" >= ${start} 
            AND p."createdAt" <= ${end}
            AND p.status = 'paid'
            ${input.providerId ? `AND b."providerId" = ${input.providerId}` : ""}
          GROUP BY DATE_TRUNC('month', p."createdAt")
          ORDER BY month
        `,

					// Payment methods breakdown
					db.payment.groupBy({
						by: ["paymentMethod"],
						where: {
							...whereClause,
							createdAt: { gte: start, lte: end },
							status: "paid",
						},
						_count: true,
						_sum: { amount: true },
					}),

					// Refund data
					db.payment.aggregate({
						where: {
							...whereClause,
							createdAt: { gte: start, lte: end },
							refundAmount: { gt: 0 },
						},
						_sum: { refundAmount: true },
						_count: true,
					}),
				]);

			// Calculate projections if requested
			const projections = input.includeProjections
				? {
						nextMonthProjection:
							(monthlyTrends as MonthlyTrend[]).length > 0
								? (monthlyTrends as MonthlyTrend[]).reduce(
										(sum, month) => sum + (month.total_revenue || 0),
										0,
									) / (monthlyTrends as MonthlyTrend[]).length
								: 0,
						yearEndProjection: revenueData._avg.amount
							? revenueData._avg.amount * 365
							: 0,
					}
				: null;

			return {
				summary: {
					totalRevenue: revenueData._sum.amount || 0,
					netRevenue: revenueData._sum.netAmount || 0,
					platformFees: revenueData._sum.serviceFee || 0,
					averageTransactionValue: revenueData._avg.amount || 0,
					totalTransactions: revenueData._count,
					refundAmount: refundData._sum.refundAmount || 0,
					refundRate:
						revenueData._count > 0
							? (refundData._count / revenueData._count) * 100
							: 0,
				},
				monthlyTrends,
				paymentMethods: paymentMethods.map((method) => ({
					method: method.paymentMethod || "unknown",
					count: method._count,
					amount: method._sum.amount || 0,
				})),
				projections,
				period: input.period,
				dateRange: { start, end },
			};
		},

		/**
		 * Get comprehensive performance metrics
		 */
		async getPerformanceMetrics(input: GetPerformanceMetricsInput) {
			const { start, end } = getDateRange(input.period);

			const [
				responseTimeMetrics,
				utilizationMetrics,
				satisfactionMetrics,
				conversionMetrics,
			] = await Promise.all([
				// Average response time to bookings
				db.$queryRaw`
          SELECT 
            AVG(EXTRACT(EPOCH FROM ("acceptedAt" - "createdAt"))/3600) as avg_response_hours,
            COUNT(CASE WHEN "acceptedAt" IS NOT NULL THEN 1 END) as accepted_bookings,
            COUNT(*) as total_bookings
          FROM "Booking"
          WHERE "createdAt" >= ${start}
            AND "createdAt" <= ${end}
            ${input.providerId ? `AND "providerId" = ${input.providerId}` : ""}
        `,

				// Service utilization
				db.$queryRaw`
          SELECT 
            s.id,
            s.title,
            COUNT(b.id) as bookings,
            s."bookingCount" as total_bookings,
            CASE 
              WHEN s."bookingCount" > 0 THEN (COUNT(b.id)::float / s."bookingCount") * 100 
              ELSE 0 
            END as utilization_rate
          FROM "Service" s
          LEFT JOIN "Booking" b ON s.id = b."serviceId" 
            AND b."createdAt" >= ${start} 
            AND b."createdAt" <= ${end}
          ${input.providerId ? `WHERE s."providerId" = ${input.providerId}` : ""}
          ${input.serviceIds ? `WHERE s.id = ANY(${input.serviceIds})` : ""}
          GROUP BY s.id, s.title, s."bookingCount"
          ORDER BY utilization_rate DESC
        `,

				// Customer satisfaction metrics
				db.review.aggregate({
					where: {
						createdAt: { gte: start, lte: end },
						...(input.providerId && { providerId: input.providerId }),
						...(input.serviceIds && { serviceId: { in: input.serviceIds } }),
					},
					_avg: { rating: true },
					_count: true,
				}),

				// Conversion metrics
				db.$queryRaw`
          SELECT 
            COUNT(CASE WHEN status = 'accepted' THEN 1 END) as accepted,
            COUNT(CASE WHEN status = 'declined' THEN 1 END) as declined,
            COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
            COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled,
            COUNT(*) as total
          FROM "Booking"
          WHERE "createdAt" >= ${start}
            AND "createdAt" <= ${end}
            ${input.providerId ? `AND "providerId" = ${input.providerId}` : ""}
        `,
			]);

			const conversionData = (conversionMetrics as ConversionMetrics[])[0] || {
				accepted: BigInt(0),
				declined: BigInt(0),
				completed: BigInt(0),
				cancelled: BigInt(0),
				total: BigInt(0),
			};

			return {
				responseTime: {
					averageResponseHours:
						(responseTimeMetrics as ResponseTimeMetrics[])[0]
							?.avg_response_hours || 0,
					acceptanceRate:
						Number(conversionData?.total) > 0
							? (Number(conversionData.accepted) /
									Number(conversionData.total)) *
								100
							: 0,
				},
				utilization: utilizationMetrics,
				satisfaction: {
					averageRating: satisfactionMetrics._avg.rating || 0,
					totalReviews: satisfactionMetrics._count,
				},
				conversion: {
					acceptanceRate:
						Number(conversionData?.total) > 0
							? (Number(conversionData.accepted) /
									Number(conversionData.total)) *
								100
							: 0,
					completionRate:
						Number(conversionData?.accepted) > 0
							? (Number(conversionData.completed) /
									Number(conversionData.accepted)) *
								100
							: 0,
					cancellationRate:
						Number(conversionData?.total) > 0
							? (Number(conversionData.cancelled) /
									Number(conversionData.total)) *
								100
							: 0,
				},
				period: input.period,
				dateRange: { start, end },
			};
		},
	};
}

// Export the factory function - already exported above
