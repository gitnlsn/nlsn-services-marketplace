import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { createCacheService } from "~/server/services/cache-service";
import { createMonitoringService } from "~/server/services/monitoring-service";
import { createQueryOptimizationService } from "~/server/services/query-optimization-service";

/**
 * Performance Router
 *
 * Provides endpoints for cache management, query optimization,
 * and performance monitoring. Admin-only access for sensitive operations.
 */

export const performanceRouter = createTRPCRouter({
	/**
	 * Get performance statistics
	 */
	getStats: protectedProcedure
		.input(
			z.object({
				minutes: z.number().min(1).max(1440).default(60), // Last N minutes
			}),
		)
		.query(async ({ ctx, input }) => {
			const monitoringService = createMonitoringService(ctx.db);
			const cacheService = createCacheService();

			const [queryStats, cacheStats, healthCheck] = await Promise.all([
				monitoringService.getQueryStats(input.minutes),
				cacheService.getStats(),
				monitoringService.healthCheck(),
			]);

			return {
				queries: queryStats,
				cache: cacheStats,
				health: healthCheck,
				timestamp: new Date(),
			};
		}),

	/**
	 * Get cache statistics and health
	 */
	getCacheStats: protectedProcedure.query(async () => {
		const cacheService = createCacheService();

		const [stats, health] = await Promise.all([
			cacheService.getStats(),
			cacheService.healthCheck(),
		]);

		return { stats, health };
	}),

	/**
	 * Clear cache by pattern (admin only)
	 */
	clearCache: protectedProcedure
		.input(
			z.object({
				pattern: z.string().min(1),
			}),
		)
		.mutation(async ({ input }) => {
			// In a real app, you'd check for admin permissions here
			const cacheService = createCacheService();

			await cacheService.delPattern(input.pattern);

			return {
				success: true,
				message: `Cache cleared for pattern: ${input.pattern}`,
			};
		}),

	/**
	 * Invalidate specific cache entries
	 */
	invalidateCache: protectedProcedure
		.input(
			z.object({
				type: z.enum(["service", "user", "booking"]),
				id: z.string(),
				additionalIds: z
					.object({
						serviceId: z.string().optional(),
						providerId: z.string().optional(),
						clientId: z.string().optional(),
					})
					.optional(),
			}),
		)
		.mutation(async ({ input }) => {
			const cacheService = createCacheService();

			switch (input.type) {
				case "service":
					await cacheService.invalidateService(input.id);
					break;
				case "user":
					await cacheService.invalidateUser(input.id);
					break;
				case "booking":
					if (
						!input.additionalIds?.serviceId ||
						!input.additionalIds?.providerId ||
						!input.additionalIds?.clientId
					) {
						throw new Error(
							"Booking invalidation requires serviceId, providerId, and clientId",
						);
					}
					await cacheService.invalidateBooking(
						input.id,
						input.additionalIds.serviceId,
						input.additionalIds.providerId,
						input.additionalIds.clientId,
					);
					break;
			}

			return {
				success: true,
				message: `Cache invalidated for ${input.type}: ${input.id}`,
			};
		}),

	/**
	 * Get optimized search results with caching
	 */
	searchServices: protectedProcedure
		.input(
			z.object({
				query: z.string().optional(),
				categoryId: z.string().optional(),
				minPrice: z.number().optional(),
				maxPrice: z.number().optional(),
				minRating: z.number().optional(),
				location: z.string().optional(),
				providerId: z.string().optional(),
				limit: z.number().min(1).max(100).default(20),
				cursor: z.string().optional(),
			}),
		)
		.query(async ({ ctx, input }) => {
			const queryOptimizer = createQueryOptimizationService({ db: ctx.db });
			const cacheService = createCacheService();

			// Generate cache key
			const filtersString = JSON.stringify({
				categoryId: input.categoryId,
				minPrice: input.minPrice,
				maxPrice: input.maxPrice,
				minRating: input.minRating,
				location: input.location,
				providerId: input.providerId,
			});

			const cacheKey = `services:search:${input.query || ""}:${filtersString}:${input.cursor ? 0 : 1}`;

			// For cursor-based pagination, don't use cache
			if (input.cursor) {
				return await queryOptimizer.searchServices(input);
			}

			// Use cache for first page
			return await cacheService.getOrSet(
				cacheKey,
				() => queryOptimizer.searchServices(input),
				300, // 5 minutes TTL
			);
		}),

	/**
	 * Get optimized provider dashboard data
	 */
	getProviderDashboard: protectedProcedure
		.input(
			z.object({
				providerId: z.string().optional(),
				period: z.enum(["week", "month", "quarter"]).default("month"),
			}),
		)
		.query(async ({ ctx, input }) => {
			const providerId = input.providerId || ctx.session.user.id;
			const queryOptimizer = createQueryOptimizationService({ db: ctx.db });
			const cacheService = createCacheService();

			// Calculate date range
			const now = new Date();
			let fromDate: Date;

			switch (input.period) {
				case "week":
					fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
					break;
				case "month":
					fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
					break;
				case "quarter": {
					const quarterStart = Math.floor(now.getMonth() / 3) * 3;
					fromDate = new Date(now.getFullYear(), quarterStart, 1);
					break;
				}
			}

			const cacheKey = `dashboard:overview:${providerId}`;

			return await cacheService.getOrSet(
				cacheKey,
				() =>
					queryOptimizer.getProviderDashboardData(providerId, {
						from: fromDate,
						to: now,
					}),
				180, // 3 minutes TTL for dashboard data
			);
		}),

	/**
	 * Get optimized availability data
	 */
	getProviderAvailability: protectedProcedure
		.input(
			z.object({
				providerId: z.string(),
				startDate: z.date(),
				endDate: z.date(),
			}),
		)
		.query(async ({ ctx, input }) => {
			const queryOptimizer = createQueryOptimizationService({ db: ctx.db });
			const cacheService = createCacheService();

			const weekKey = `${input.startDate.toISOString().slice(0, 10)}_${input.endDate.toISOString().slice(0, 10)}`;
			const cacheKey = `provider:schedule:${input.providerId}:${weekKey}`;

			return await cacheService.getOrSet(
				cacheKey,
				() =>
					queryOptimizer.getProviderAvailability(
						input.providerId,
						input.startDate,
						input.endDate,
					),
				600, // 10 minutes TTL for availability
			);
		}),

	/**
	 * Get optimized conversation list
	 */
	getConversations: protectedProcedure
		.input(
			z.object({
				limit: z.number().min(1).max(50).default(20),
				cursor: z.string().optional(),
			}),
		)
		.query(async ({ ctx, input }) => {
			const queryOptimizer = createQueryOptimizationService({ db: ctx.db });
			const cacheService = createCacheService();

			// Don't cache paginated results
			if (input.cursor) {
				return await queryOptimizer.getUserConversations(
					ctx.session.user.id,
					input.limit,
					input.cursor,
				);
			}

			const cacheKey = `conversations:${ctx.session.user.id}`;

			return await cacheService.getOrSet(
				cacheKey,
				() =>
					queryOptimizer.getUserConversations(ctx.session.user.id, input.limit),
				120, // 2 minutes TTL for conversations
			);
		}),

	/**
	 * Batch update service metrics (admin operation)
	 */
	updateServiceMetrics: protectedProcedure
		.input(
			z.object({
				serviceIds: z.array(z.string()).max(100),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// In a real app, you'd check for admin permissions here
			const queryOptimizer = createQueryOptimizationService({ db: ctx.db });
			const cacheService = createCacheService();

			const results = await queryOptimizer.batchUpdateServiceMetrics(
				input.serviceIds,
			);

			// Invalidate relevant caches
			await Promise.all(
				input.serviceIds.map((serviceId) =>
					cacheService.invalidateService(serviceId),
				),
			);

			return {
				success: true,
				updated: results.length,
				serviceIds: input.serviceIds,
			};
		}),

	/**
	 * Get analytics data with optimization
	 */
	getAnalytics: protectedProcedure
		.input(
			z.object({
				providerId: z.string().optional(),
				period: z.enum(["day", "week", "month"]).default("month"),
				startDate: z.date(),
				endDate: z.date(),
			}),
		)
		.query(async ({ ctx, input }) => {
			const providerId = input.providerId || ctx.session.user.id;
			const queryOptimizer = createQueryOptimizationService({ db: ctx.db });
			const cacheService = createCacheService();

			const cacheKey = `analytics:${providerId}:${input.period}:${input.startDate.toISOString().slice(0, 10)}_${input.endDate.toISOString().slice(0, 10)}`;

			return await cacheService.getOrSet(
				cacheKey,
				() =>
					queryOptimizer.getAnalyticsData(
						providerId,
						input.period,
						input.startDate,
						input.endDate,
					),
				900, // 15 minutes TTL for analytics
			);
		}),

	/**
	 * Get system health check
	 */
	healthCheck: protectedProcedure.query(async ({ ctx }) => {
		const monitoringService = createMonitoringService(ctx.db);
		const cacheService = createCacheService();

		const [dbHealth, cacheHealth] = await Promise.all([
			monitoringService.healthCheck(),
			cacheService.healthCheck(),
		]);

		return {
			database: dbHealth,
			cache: cacheHealth,
			timestamp: new Date(),
			uptime: process.uptime(),
		};
	}),

	/**
	 * Export performance metrics (admin only)
	 */
	exportMetrics: protectedProcedure.query(async ({ ctx }) => {
		// In a real app, you'd check for admin permissions here
		const monitoringService = createMonitoringService(ctx.db);

		return monitoringService.exportMetrics();
	}),
});
