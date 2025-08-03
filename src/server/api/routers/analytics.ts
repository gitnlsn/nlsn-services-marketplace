import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import {
	createAnalyticsService,
	getBookingAnalyticsSchema,
	getCustomerAnalyticsSchema,
	getPerformanceMetricsSchema,
	getPlatformAnalyticsSchema,
	getProviderAnalyticsSchema,
	getRevenueAnalyticsSchema,
	getServiceAnalyticsSchema,
} from "~/server/services/analytics-service";
import { createCacheService } from "~/server/services/cache-service";

/**
 * Analytics Router
 *
 * Provides comprehensive analytics and reporting endpoints for providers,
 * services, and platform-wide metrics. Includes caching for performance.
 */

export const analyticsRouter = createTRPCRouter({
	/**
	 * Get provider analytics dashboard
	 */
	getProviderAnalytics: protectedProcedure
		.input(getProviderAnalyticsSchema)
		.query(async ({ ctx, input }) => {
			const analyticsService = createAnalyticsService({
				db: ctx.db,
				currentUser: ctx.session.user,
			});
			const cacheService = createCacheService();

			// Use the current user as provider if not specified
			const providerId = input.providerId || ctx.session.user.id;

			// Generate cache key
			const cacheKey = `analytics:provider:${providerId}:${input.period}:${input.startDate?.toISOString() || "auto"}:${input.endDate?.toISOString() || "auto"}`;

			return await cacheService.getOrSet(
				cacheKey,
				() => analyticsService.getProviderAnalytics({ ...input, providerId }),
				600, // 10 minutes TTL
			);
		}),

	/**
	 * Get service-specific analytics
	 */
	getServiceAnalytics: protectedProcedure
		.input(getServiceAnalyticsSchema)
		.query(async ({ ctx, input }) => {
			const analyticsService = createAnalyticsService({
				db: ctx.db,
				currentUser: ctx.session.user,
			});
			const cacheService = createCacheService();

			// Verify service ownership
			const service = await ctx.db.service.findUnique({
				where: { id: input.serviceId },
				select: { providerId: true },
			});

			if (!service || service.providerId !== ctx.session.user.id) {
				throw new Error("Service not found or access denied");
			}

			const cacheKey = `analytics:service:${input.serviceId}:${input.period}:${input.compareWithPrevious}`;

			return await cacheService.getOrSet(
				cacheKey,
				() => analyticsService.getServiceAnalytics(input),
				300, // 5 minutes TTL
			);
		}),

	/**
	 * Get platform-wide analytics (admin only)
	 */
	getPlatformAnalytics: protectedProcedure
		.input(getPlatformAnalyticsSchema)
		.query(async ({ ctx, input }) => {
			// Check if user is admin (you can implement your own admin check logic)
			const user = await ctx.db.user.findUnique({
				where: { id: ctx.session.user.id },
				select: { isProfessional: true, email: true },
			});

			// For demo purposes, allow professionals to see platform analytics
			// In production, you'd want more specific admin role checks
			if (!user?.isProfessional) {
				throw new Error("Platform analytics require admin access");
			}

			const analyticsService = createAnalyticsService({
				db: ctx.db,
				currentUser: {
					...ctx.session.user,
					isProfessional: user.isProfessional,
				},
			});
			const cacheService = createCacheService();

			const cacheKey = `analytics:platform:${input.period}:${input.breakdown}`;

			return await cacheService.getOrSet(
				cacheKey,
				() => analyticsService.getPlatformAnalytics(input),
				900, // 15 minutes TTL for platform analytics
			);
		}),

	/**
	 * Get revenue analytics
	 */
	getRevenueAnalytics: protectedProcedure
		.input(getRevenueAnalyticsSchema)
		.query(async ({ ctx, input }) => {
			const analyticsService = createAnalyticsService({
				db: ctx.db,
				currentUser: ctx.session.user,
			});
			const cacheService = createCacheService();

			// Use current user as provider if not specified
			const providerId = input.providerId || ctx.session.user.id;

			const cacheKey = `analytics:revenue:${providerId}:${input.period}:${input.includeProjections}`;

			return await cacheService.getOrSet(
				cacheKey,
				() => analyticsService.getRevenueAnalytics({ ...input, providerId }),
				600, // 10 minutes TTL
			);
		}),

	/**
	 * Get booking analytics
	 */
	getBookingAnalytics: protectedProcedure
		.input(getBookingAnalyticsSchema)
		.query(async ({ ctx, input }) => {
			const analyticsService = createAnalyticsService({
				db: ctx.db,
				currentUser: ctx.session.user,
			});
			const cacheService = createCacheService();

			// Use current user as provider if not specified
			const providerId = input.providerId || ctx.session.user.id;

			const cacheKey = `analytics:bookings:${providerId}:${input.serviceId || "all"}:${input.period}:${input.groupBy}`;

			return await cacheService.getOrSet(
				cacheKey,
				() => analyticsService.getProviderAnalytics({ ...input, providerId }),
				300, // 5 minutes TTL
			);
		}),

	/**
	 * Get customer analytics
	 */
	getCustomerAnalytics: protectedProcedure
		.input(getCustomerAnalyticsSchema)
		.query(async ({ ctx, input }) => {
			const analyticsService = createAnalyticsService({
				db: ctx.db,
				currentUser: ctx.session.user,
			});
			const cacheService = createCacheService();

			// Use current user as provider if not specified
			const providerId = input.providerId || ctx.session.user.id;

			const cacheKey = `analytics:customers:${providerId}:${input.period}:${input.segment}`;

			return await cacheService.getOrSet(
				cacheKey,
				() => analyticsService.getProviderAnalytics({ ...input, providerId }),
				600, // 10 minutes TTL
			);
		}),

	/**
	 * Get performance metrics
	 */
	getPerformanceMetrics: protectedProcedure
		.input(getPerformanceMetricsSchema)
		.query(async ({ ctx, input }) => {
			const analyticsService = createAnalyticsService({
				db: ctx.db,
				currentUser: ctx.session.user,
			});
			const cacheService = createCacheService();

			// Use current user as provider if not specified
			const providerId = input.providerId || ctx.session.user.id;

			const cacheKey = `analytics:performance:${providerId}:${input.serviceIds?.join(",") || "all"}:${input.period}`;

			return await cacheService.getOrSet(
				cacheKey,
				() => analyticsService.getPerformanceMetrics({ ...input, providerId }),
				300, // 5 minutes TTL
			);
		}),

	/**
	 * Get analytics summary for dashboard
	 */
	getDashboardSummary: protectedProcedure
		.input(
			z.object({
				period: z.enum(["7d", "30d", "90d"]).default("30d"),
			}),
		)
		.query(async ({ ctx, input }) => {
			const analyticsService = createAnalyticsService({
				db: ctx.db,
				currentUser: ctx.session.user,
			});
			const cacheService = createCacheService();

			const cacheKey = `analytics:dashboard:${ctx.session.user.id}:${input.period}`;

			return await cacheService.getOrSet(
				cacheKey,
				async () => {
					const [providerAnalytics, revenueAnalytics, performanceMetrics] =
						await Promise.all([
							analyticsService.getProviderAnalytics({
								providerId: ctx.session.user.id,
								period: input.period,
							}),
							analyticsService.getRevenueAnalytics({
								providerId: ctx.session.user.id,
								period: input.period,
								includeProjections: false,
							}),
							analyticsService.getPerformanceMetrics({
								providerId: ctx.session.user.id,
								period: input.period,
							}),
						]);

					return {
						overview: providerAnalytics.overview,
						revenue: revenueAnalytics.summary,
						performance: {
							responseTime: performanceMetrics.responseTime,
							satisfaction: performanceMetrics.satisfaction,
							conversion: performanceMetrics.conversion,
						},
						topServices: providerAnalytics.topServices.slice(0, 3),
						recentTrends:
							(
								providerAnalytics.trends as Array<{
									date: string;
									bookings: number;
									revenue: number;
								}>
							)?.slice(-7) || [], // Last 7 days
						period: input.period,
					};
				},
				300, // 5 minutes TTL for dashboard summary
			);
		}),

	/**
	 * Export analytics data
	 */
	exportAnalytics: protectedProcedure
		.input(
			z.object({
				type: z.enum(["provider", "service", "revenue", "bookings"]),
				period: z.enum(["7d", "30d", "90d", "6m", "1y"]).default("30d"),
				format: z.enum(["json", "csv"]).default("json"),
				serviceId: z.string().optional(),
			}),
		)
		.query(async ({ ctx, input }) => {
			const analyticsService = createAnalyticsService({
				db: ctx.db,
				currentUser: ctx.session.user,
			});

			let data: unknown;

			switch (input.type) {
				case "provider":
					data = await analyticsService.getProviderAnalytics({
						providerId: ctx.session.user.id,
						period: input.period,
					});
					break;
				case "service":
					if (!input.serviceId) {
						throw new Error("Service ID required for service analytics export");
					}
					data = await analyticsService.getServiceAnalytics({
						serviceId: input.serviceId,
						period: input.period,
						compareWithPrevious: false,
					});
					break;
				case "revenue":
					data = await analyticsService.getRevenueAnalytics({
						providerId: ctx.session.user.id,
						period: input.period,
						includeProjections: true,
					});
					break;
				case "bookings":
					data = await analyticsService.getProviderAnalytics({
						providerId: ctx.session.user.id,
						period: input.period,
					});
					break;
			}

			return {
				data,
				format: input.format,
				exportedAt: new Date(),
				type: input.type,
				period: input.period,
			};
		}),

	/**
	 * Get analytics insights and recommendations
	 */
	getInsights: protectedProcedure
		.input(
			z.object({
				period: z.enum(["30d", "90d"]).default("30d"),
			}),
		)
		.query(async ({ ctx, input }) => {
			const analyticsService = createAnalyticsService({
				db: ctx.db,
				currentUser: ctx.session.user,
			});

			const [analytics, performance] = await Promise.all([
				analyticsService.getProviderAnalytics({
					providerId: ctx.session.user.id,
					period: input.period,
				}),
				analyticsService.getPerformanceMetrics({
					providerId: ctx.session.user.id,
					period: input.period,
				}),
			]);

			const insights: Array<{
				type: "positive" | "warning" | "info";
				title: string;
				description: string;
				action?: string;
			}> = [];

			// Revenue growth insight
			if (analytics.overview.revenueGrowth > 10) {
				insights.push({
					type: "positive",
					title: "Strong Revenue Growth",
					description: `Your revenue has grown ${analytics.overview.revenueGrowth.toFixed(1)}% compared to the previous period.`,
				});
			} else if (analytics.overview.revenueGrowth < -10) {
				insights.push({
					type: "warning",
					title: "Revenue Decline",
					description: `Your revenue has decreased ${Math.abs(analytics.overview.revenueGrowth).toFixed(1)}% compared to the previous period.`,
					action: "Consider reviewing your pricing or promoting your services.",
				});
			}

			// Booking performance insight
			if (analytics.overview.bookingGrowth > 20) {
				insights.push({
					type: "positive",
					title: "Booking Surge",
					description: `You've received ${analytics.overview.bookingGrowth.toFixed(1)}% more bookings than the previous period.`,
				});
			}

			// Response time insight
			if (performance.responseTime.averageResponseHours > 24) {
				insights.push({
					type: "warning",
					title: "Slow Response Time",
					description: `Your average response time is ${performance.responseTime.averageResponseHours.toFixed(1)} hours.`,
					action:
						"Try to respond to bookings within 12 hours to improve customer satisfaction.",
				});
			}

			// Customer satisfaction insight
			if (performance.satisfaction.averageRating > 4.5) {
				insights.push({
					type: "positive",
					title: "Excellent Customer Satisfaction",
					description: `Your average rating is ${performance.satisfaction.averageRating.toFixed(1)} stars.`,
				});
			} else if (performance.satisfaction.averageRating < 3.5) {
				insights.push({
					type: "warning",
					title: "Low Customer Satisfaction",
					description: `Your average rating is ${performance.satisfaction.averageRating.toFixed(1)} stars.`,
					action:
						"Focus on improving service quality and customer communication.",
				});
			}

			// Conversion rate insight
			if (performance.conversion.acceptanceRate < 70) {
				insights.push({
					type: "info",
					title: "Booking Acceptance Rate",
					description: `You're accepting ${performance.conversion.acceptanceRate.toFixed(1)}% of booking requests.`,
					action:
						"Consider adjusting your availability or service descriptions to match customer expectations.",
				});
			}

			return {
				insights,
				summary: {
					revenue: analytics.overview.totalRevenue,
					bookings: analytics.overview.totalBookings,
					rating: performance.satisfaction.averageRating,
					responseTime: performance.responseTime.averageResponseHours,
				},
				period: input.period,
				generatedAt: new Date(),
			};
		}),
});
