import { Redis } from "ioredis";
import { env } from "~/env";

/**
 * Cache Service for improving database performance
 *
 * Provides Redis-based caching with TTL support and efficient invalidation patterns.
 * Falls back to in-memory caching when Redis is not available.
 */

interface CacheServiceDeps {
	redis?: Redis;
}

export class CacheService {
	private redis: Redis | null = null;
	private memoryCache = new Map<string, { value: unknown; expires: number }>();
	private readonly DEFAULT_TTL = 300; // 5 minutes

	constructor(deps: CacheServiceDeps = {}) {
		this.redis = deps.redis || this.initializeRedis();
	}

	private initializeRedis(): Redis | null {
		try {
			if (env.REDIS_URL) {
				return new Redis(env.REDIS_URL);
			}
			return null;
		} catch (error) {
			console.warn(
				"Redis connection failed, falling back to memory cache",
				error,
			);
			return null;
		}
	}

	/**
	 * Get cached value
	 */
	async get<T = unknown>(key: string): Promise<T | null> {
		try {
			if (this.redis) {
				const value = await this.redis.get(key);
				return value ? JSON.parse(value) : null;
			}
			// Memory cache fallback
			const cached = this.memoryCache.get(key);
			if (cached && cached.expires > Date.now()) {
				return cached.value as T;
			}
			if (cached) {
				this.memoryCache.delete(key);
			}
			return null;
		} catch (error) {
			console.error("Cache get error:", error);
			return null;
		}
	}

	/**
	 * Set cached value with TTL
	 */
	async set(
		key: string,
		value: unknown,
		ttlSeconds = this.DEFAULT_TTL,
	): Promise<void> {
		try {
			if (this.redis) {
				await this.redis.setex(key, ttlSeconds, JSON.stringify(value));
			} else {
				// Memory cache fallback
				this.memoryCache.set(key, {
					value,
					expires: Date.now() + ttlSeconds * 1000,
				});

				// Clean up expired entries periodically
				if (this.memoryCache.size > 1000) {
					this.cleanupMemoryCache();
				}
			}
		} catch (error) {
			console.error("Cache set error:", error);
		}
	}

	/**
	 * Delete cached value
	 */
	async del(key: string): Promise<void> {
		try {
			if (this.redis) {
				await this.redis.del(key);
			} else {
				this.memoryCache.delete(key);
			}
		} catch (error) {
			console.error("Cache delete error:", error);
		}
	}

	/**
	 * Delete multiple keys by pattern
	 */
	async delPattern(pattern: string): Promise<void> {
		try {
			if (this.redis) {
				const keys = await this.redis.keys(pattern);
				if (keys.length > 0) {
					await this.redis.del(...keys);
				}
			} else {
				// For memory cache, iterate through keys
				const keysToDelete = Array.from(this.memoryCache.keys()).filter((key) =>
					key.includes(pattern.replace("*", "")),
				);
				for (const key of keysToDelete) {
					this.memoryCache.delete(key);
				}
			}
		} catch (error) {
			console.error("Cache pattern delete error:", error);
		}
	}

	/**
	 * Get or set cached value (cache-aside pattern)
	 */
	async getOrSet<T>(
		key: string,
		fetcher: () => Promise<T>,
		ttlSeconds = this.DEFAULT_TTL,
	): Promise<T> {
		const cached = await this.get<T>(key);
		if (cached !== null) {
			return cached;
		}

		const value = await fetcher();
		await this.set(key, value, ttlSeconds);
		return value;
	}

	/**
	 * Increment counter (useful for rate limiting)
	 */
	async increment(key: string, ttlSeconds = this.DEFAULT_TTL): Promise<number> {
		try {
			if (this.redis) {
				const value = await this.redis.incr(key);
				if (value === 1) {
					await this.redis.expire(key, ttlSeconds);
				}
				return value;
			}
			const cached = this.memoryCache.get(key);
			const currentValue =
				cached && cached.expires > Date.now() ? (cached.value as number) : 0;
			const newValue = currentValue + 1;

			this.memoryCache.set(key, {
				value: newValue,
				expires: Date.now() + ttlSeconds * 1000,
			});

			return newValue;
		} catch (error) {
			console.error("Cache increment error:", error);
			return 0;
		}
	}

	/**
	 * Cache invalidation helpers for specific data types
	 */
	async invalidateService(serviceId: string): Promise<void> {
		await Promise.all([
			this.del(`service:${serviceId}`),
			this.delPattern("services:provider:*"),
			this.delPattern("services:category:*"),
			this.delPattern("services:search:*"),
			this.delPattern(`availability:${serviceId}:*`),
		]);
	}

	async invalidateUser(userId: string): Promise<void> {
		await Promise.all([
			this.del(`user:${userId}`),
			this.delPattern(`services:provider:${userId}:*`),
			this.delPattern(`bookings:provider:${userId}:*`),
			this.delPattern(`bookings:client:${userId}:*`),
			this.delPattern(`dashboard:${userId}:*`),
		]);
	}

	async invalidateBooking(
		bookingId: string,
		serviceId: string,
		providerId: string,
		clientId: string,
	): Promise<void> {
		await Promise.all([
			this.del(`booking:${bookingId}`),
			this.delPattern(`bookings:provider:${providerId}:*`),
			this.delPattern(`bookings:client:${clientId}:*`),
			this.delPattern(`availability:${serviceId}:*`),
			this.delPattern(`dashboard:${providerId}:*`),
			this.delPattern(`dashboard:${clientId}:*`),
		]);
	}

	/**
	 * Clean up expired memory cache entries
	 */
	private cleanupMemoryCache(): void {
		const now = Date.now();
		for (const [key, cached] of this.memoryCache.entries()) {
			if (cached.expires <= now) {
				this.memoryCache.delete(key);
			}
		}
	}

	/**
	 * Generate cache keys for common patterns
	 */
	static keys = {
		service: (id: string) => `service:${id}`,
		servicesByProvider: (providerId: string, page = 1) =>
			`services:provider:${providerId}:${page}`,
		servicesByCategory: (categoryId: string, page = 1) =>
			`services:category:${categoryId}:${page}`,
		servicesSearch: (query: string, filters: string, page = 1) =>
			`services:search:${Buffer.from(query + filters).toString("base64")}:${page}`,
		user: (id: string) => `user:${id}`,
		booking: (id: string) => `booking:${id}`,
		bookingsByProvider: (providerId: string, status?: string, page = 1) =>
			`bookings:provider:${providerId}:${status || "all"}:${page}`,
		bookingsByClient: (clientId: string, status?: string, page = 1) =>
			`bookings:client:${clientId}:${status || "all"}:${page}`,
		availability: (serviceId: string, date: string) =>
			`availability:${serviceId}:${date}`,
		providerSchedule: (providerId: string, week: string) =>
			`schedule:${providerId}:${week}`,
		dashboardOverview: (userId: string) => `dashboard:${userId}:overview`,
		dashboardEarnings: (userId: string, period: string) =>
			`dashboard:${userId}:earnings:${period}`,
		conversations: (userId: string, page = 1) =>
			`conversations:${userId}:${page}`,
		notifications: (userId: string, status: string, page = 1) =>
			`notifications:${userId}:${status}:${page}`,
		rateLimit: (key: string) => `rate_limit:${key}`,
	};

	/**
	 * Health check
	 */
	async healthCheck(): Promise<{ redis: boolean; memory: boolean }> {
		const result = { redis: false, memory: true };

		try {
			if (this.redis) {
				await this.redis.ping();
				result.redis = true;
			}
		} catch (error) {
			console.error("Redis health check failed:", error);
		}

		return result;
	}

	/**
	 * Get cache statistics
	 */
	async getStats(): Promise<{
		redis?: string;
		memory: { size: number; entries: number };
	}> {
		const stats: {
			redis?: string;
			memory: { size: number; entries: number };
		} = {
			memory: {
				size: this.memoryCache.size,
				entries: Array.from(this.memoryCache.values()).filter(
					(cached) => cached.expires > Date.now(),
				).length,
			},
		};

		if (this.redis) {
			try {
				const info = await this.redis.info("memory");
				stats.redis = info;
			} catch (error) {
				console.error("Redis stats error:", error);
			}
		}

		return stats;
	}
}

// Create singleton instance
export const cacheService = new CacheService();

// Factory function
export const createCacheService = (deps?: CacheServiceDeps) =>
	new CacheService(deps);
