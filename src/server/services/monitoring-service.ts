import type { PrismaClient } from "@prisma/client";

/**
 * Monitoring Service for database performance and application metrics
 *
 * Provides query performance monitoring, slow query detection, and
 * application metrics collection for optimization insights.
 */

interface QueryMetrics {
	query: string;
	duration: number;
	timestamp: Date;
	userId?: string;
	params?: Record<string, unknown>;
}

interface PerformanceAlert {
	type: "slow_query" | "high_error_rate" | "memory_usage" | "connection_pool";
	severity: "low" | "medium" | "high" | "critical";
	message: string;
	timestamp: Date;
	metadata?: Record<string, unknown>;
}

export class MonitoringService {
	private queryMetrics: QueryMetrics[] = [];
	private errorCount = 0;
	private totalQueries = 0;
	private readonly MAX_METRICS_HISTORY = 1000;
	private readonly SLOW_QUERY_THRESHOLD = 1000; // ms
	private readonly HIGH_ERROR_RATE_THRESHOLD = 0.05; // 5%

	constructor(private db: PrismaClient) {
		this.setupPrismaMiddleware();
	}

	/**
	 * Setup Prisma middleware for query monitoring
	 */
	private setupPrismaMiddleware(): void {
		this.db.$use(async (params, next) => {
			const start = Date.now();

			try {
				const result = await next(params);
				const duration = Date.now() - start;

				this.recordQueryMetric({
					query: `${params.model}.${params.action}`,
					duration,
					timestamp: new Date(),
					params: this.sanitizeParams(params.args),
				});

				if (duration > this.SLOW_QUERY_THRESHOLD) {
					this.recordSlowQuery({
						query: `${params.model}.${params.action}`,
						duration,
						params: params.args,
					});
				}

				return result;
			} catch (error) {
				this.errorCount++;
				this.recordError(error as Error, {
					query: `${params.model}.${params.action}`,
					params: params.args,
				});
				throw error;
			} finally {
				this.totalQueries++;
			}
		});
	}

	/**
	 * Record query performance metric
	 */
	private recordQueryMetric(metric: QueryMetrics): void {
		this.queryMetrics.push(metric);

		// Keep only recent metrics to prevent memory issues
		if (this.queryMetrics.length > this.MAX_METRICS_HISTORY) {
			this.queryMetrics = this.queryMetrics.slice(-this.MAX_METRICS_HISTORY);
		}
	}

	/**
	 * Record slow query for analysis
	 */
	private recordSlowQuery(data: {
		query: string;
		duration: number;
		params?: Record<string, unknown>;
	}): void {
		console.warn("Slow query detected:", {
			query: data.query,
			duration: `${data.duration}ms`,
			params: this.sanitizeParams(data.params),
			timestamp: new Date().toISOString(),
		});

		// In production, you might want to send this to a monitoring service
		// like DataDog, New Relic, or a custom logging system
	}

	/**
	 * Record error for monitoring
	 */
	private recordError(error: Error, context: Record<string, unknown>): void {
		console.error("Database operation failed:", {
			error: error.message,
			stack: error.stack,
			context: this.sanitizeParams(context),
			timestamp: new Date().toISOString(),
		});

		// Check for high error rate
		const errorRate =
			this.totalQueries > 0 ? this.errorCount / this.totalQueries : 0;
		if (errorRate > this.HIGH_ERROR_RATE_THRESHOLD) {
			this.createAlert({
				type: "high_error_rate",
				severity: "high",
				message: `High error rate detected: ${(errorRate * 100).toFixed(2)}%`,
				timestamp: new Date(),
				metadata: {
					errorRate,
					totalQueries: this.totalQueries,
					errorCount: this.errorCount,
				},
			});
		}
	}

	/**
	 * Sanitize params for logging (remove sensitive data)
	 */
	private sanitizeParams(
		params: Record<string, unknown> | undefined,
	): Record<string, unknown> | undefined {
		if (!params) return params;

		const sensitiveFields = [
			"password",
			"token",
			"secret",
			"key",
			"cpf",
			"ssn",
		];
		const sanitized = JSON.parse(JSON.stringify(params));

		const sanitizeObject = (
			obj: Record<string, unknown>,
		): Record<string, unknown> => {
			if (typeof obj !== "object" || obj === null) return obj;

			for (const key in obj) {
				if (
					sensitiveFields.some((field) => key.toLowerCase().includes(field))
				) {
					obj[key] = "[REDACTED]";
				} else if (typeof obj[key] === "object" && obj[key] !== null) {
					obj[key] = sanitizeObject(obj[key] as Record<string, unknown>);
				}
			}

			return obj;
		};

		return sanitizeObject(sanitized);
	}

	/**
	 * Create performance alert
	 */
	private createAlert(alert: PerformanceAlert): void {
		console.warn("Performance alert:", alert);

		// In production, send to monitoring service or notification system
	}

	/**
	 * Get query performance statistics
	 */
	getQueryStats(minutes = 60): {
		totalQueries: number;
		averageDuration: number;
		slowQueries: number;
		queryDistribution: Record<string, { count: number; avgDuration: number }>;
	} {
		const cutoff = new Date(Date.now() - minutes * 60 * 1000);
		const recentMetrics = this.queryMetrics.filter(
			(m) => m.timestamp >= cutoff,
		);

		const totalQueries = recentMetrics.length;
		const averageResponseTime =
			totalQueries > 0
				? recentMetrics.reduce((sum, m) => sum + m.duration, 0) / totalQueries
				: 0;

		const slowQueries = recentMetrics.filter(
			(m) => m.duration > this.SLOW_QUERY_THRESHOLD,
		).length;
		const errorRate =
			this.totalQueries > 0 ? this.errorCount / this.totalQueries : 0;

		// Group by query type and calculate averages
		const queryGroups = recentMetrics.reduce(
			(acc, metric) => {
				if (!acc[metric.query]) {
					acc[metric.query] = { durations: [], count: 0 };
				}
				const queryData = acc[metric.query];
				if (queryData) {
					queryData.durations.push(metric.duration);
					queryData.count++;
				}
				return acc;
			},
			{} as Record<string, { durations: number[]; count: number }>,
		);

		const topSlowQueries = Object.entries(queryGroups)
			.map(([query, data]) => ({
				query,
				averageDuration:
					data.durations.reduce((sum, d) => sum + d, 0) / data.durations.length,
				count: data.count,
			}))
			.filter((q) => q.averageDuration > 100) // Only include queries > 100ms
			.sort((a, b) => b.averageDuration - a.averageDuration)
			.slice(0, 10);

		// Convert to expected format
		const queryDistribution: Record<
			string,
			{ count: number; avgDuration: number }
		> = {};
		for (const [query, data] of Object.entries(queryGroups)) {
			queryDistribution[query] = {
				count: data.count,
				avgDuration:
					data.durations.reduce((sum, d) => sum + d, 0) / data.durations.length,
			};
		}

		return {
			totalQueries,
			averageDuration: averageResponseTime,
			slowQueries,
			queryDistribution,
		};
	}

	/**
	 * Get database connection pool statistics
	 */
	async getConnectionStats(): Promise<{
		active: number;
		idle: number;
		total: number;
	}> {
		try {
			// This is a simplified version - actual implementation would depend on your connection pool
			// $metrics is not available in all Prisma configurations
			// const metrics = await this.db.$metrics.json();
			const metrics = { counters: [] };

			return {
				active:
					(metrics.counters as Array<{ key: string; value: number }>).find(
						(c) => c.key === "prisma:engine:db_queries_active",
					)?.value || 0,
				idle:
					(metrics.counters as Array<{ key: string; value: number }>).find(
						(c) => c.key === "prisma:engine:connection_pool_idle",
					)?.value || 0,
				total:
					(metrics.counters as Array<{ key: string; value: number }>).find(
						(c) => c.key === "prisma:engine:connection_pool_total",
					)?.value || 0,
			};
		} catch (error) {
			console.error("Failed to get connection stats:", error);
			return { active: 0, idle: 0, total: 0 };
		}
	}

	/**
	 * Get system resource usage
	 */
	getResourceUsage(): {
		memoryUsage: NodeJS.MemoryUsage;
		uptime: number;
		cpuUsage: NodeJS.CpuUsage;
	} {
		return {
			memoryUsage: process.memoryUsage(),
			uptime: process.uptime(),
			cpuUsage: process.cpuUsage(),
		};
	}

	/**
	 * Health check for all monitored systems
	 */
	async healthCheck(): Promise<{
		database: "healthy" | "degraded" | "unhealthy";
		performance: "good" | "warning" | "critical";
		errors: "low" | "medium" | "high";
		details: Record<string, unknown>;
	}> {
		const stats = this.getQueryStats(10); // Last 10 minutes
		const resources = this.getResourceUsage();

		let database: "healthy" | "degraded" | "unhealthy" = "healthy";
		let performance: "good" | "warning" | "critical" = "good";
		let errors: "low" | "medium" | "high" = "low";

		try {
			await this.db.$queryRaw`SELECT 1`;
		} catch (error) {
			database = "unhealthy";
		}

		// Check performance thresholds
		if (stats.averageDuration > 2000) {
			performance = "critical";
		} else if (stats.averageDuration > 500) {
			performance = "warning";
		}

		// Check error rates
		const errorRate =
			this.totalQueries > 0 ? this.errorCount / this.totalQueries : 0;
		if (errorRate > 0.1) {
			// 10%
			errors = "high";
		} else if (errorRate > 0.05) {
			// 5%
			errors = "medium";
		}

		// Check memory usage
		const memoryUsagePercent =
			resources.memoryUsage.heapUsed / resources.memoryUsage.heapTotal;
		if (memoryUsagePercent > 0.9) {
			this.createAlert({
				type: "memory_usage",
				severity: "critical",
				message: `High memory usage: ${(memoryUsagePercent * 100).toFixed(2)}%`,
				timestamp: new Date(),
				metadata: resources.memoryUsage as unknown as Record<string, unknown>,
			});
		}

		return {
			database,
			performance,
			errors,
			details: {
				queryStats: stats,
				resourceUsage: resources,
				timestamp: new Date(),
			},
		};
	}

	/**
	 * Reset monitoring statistics
	 */
	reset(): void {
		this.queryMetrics = [];
		this.errorCount = 0;
		this.totalQueries = 0;
	}

	/**
	 * Export metrics for external monitoring systems
	 */
	exportMetrics(): {
		queries: QueryMetrics[];
		summary: {
			totalQueries: number;
			averageDuration: number;
			slowQueries: number;
			queryDistribution: Record<string, { count: number; avgDuration: number }>;
		};
		health: Record<string, unknown>;
		timestamp: Date;
	} {
		return {
			queries: this.queryMetrics.slice(-100), // Last 100 queries
			summary: this.getQueryStats(),
			health: this.getResourceUsage(),
			timestamp: new Date(),
		};
	}
}

// Factory function
export const createMonitoringService = (db: PrismaClient) =>
	new MonitoringService(db);
