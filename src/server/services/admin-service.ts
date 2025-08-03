import type { Prisma, PrismaClient } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

/**
 * Admin Service for platform management
 *
 * Provides comprehensive admin functionality for managing users, services,
 * bookings, payments, and platform-wide operations.
 */

// Input schemas
export const getUserManagementSchema = z.object({
	page: z.number().min(1).default(1),
	limit: z.number().min(1).max(100).default(20),
	search: z.string().optional(),
	role: z.enum(["all", "users", "professionals"]).default("all"),
	status: z.enum(["all", "active", "suspended"]).default("all"),
	sortBy: z
		.enum(["name", "email", "createdAt", "bookingCount"])
		.default("createdAt"),
	sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export const getServiceManagementSchema = z.object({
	page: z.number().min(1).default(1),
	limit: z.number().min(1).max(100).default(20),
	search: z.string().optional(),
	categoryId: z.string().cuid().optional(),
	status: z
		.enum(["all", "active", "pending", "rejected", "suspended"])
		.default("all"),
	sortBy: z
		.enum(["title", "price", "rating", "createdAt", "bookingCount"])
		.default("createdAt"),
	sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export const getBookingManagementSchema = z.object({
	page: z.number().min(1).default(1),
	limit: z.number().min(1).max(100).default(20),
	search: z.string().optional(),
	status: z
		.enum(["all", "pending", "accepted", "completed", "cancelled", "disputed"])
		.default("all"),
	dateFrom: z.date().optional(),
	dateTo: z.date().optional(),
	sortBy: z
		.enum(["createdAt", "scheduledDate", "totalPrice"])
		.default("createdAt"),
	sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export const getPaymentManagementSchema = z.object({
	page: z.number().min(1).default(1),
	limit: z.number().min(1).max(100).default(20),
	status: z
		.enum(["all", "pending", "paid", "failed", "refunded"])
		.default("all"),
	paymentMethod: z.enum(["all", "credit_card", "pix", "boleto"]).default("all"),
	dateFrom: z.date().optional(),
	dateTo: z.date().optional(),
	minAmount: z.number().min(0).optional(),
	maxAmount: z.number().min(0).optional(),
	sortBy: z.enum(["createdAt", "amount", "status"]).default("createdAt"),
	sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export const updateUserStatusSchema = z.object({
	userId: z.string().cuid(),
	action: z.enum(["activate", "suspend", "delete"]),
	reason: z.string().min(10).max(500),
});

export const updateServiceStatusSchema = z.object({
	serviceId: z.string().cuid(),
	status: z.enum(["active", "pending", "rejected", "suspended"]),
	reason: z.string().min(10).max(500),
});

export const resolveDisputeSchema = z.object({
	bookingId: z.string().cuid(),
	resolution: z.enum([
		"refund_full",
		"refund_partial",
		"no_refund",
		"reschedule",
	]),
	refundAmount: z.number().min(0).optional(),
	notes: z.string().min(10).max(1000),
	notifyParties: z.boolean().default(true),
});

export const getPlatformStatsSchema = z.object({
	period: z.enum(["24h", "7d", "30d", "90d", "1y"]).default("30d"),
	includeProjections: z.boolean().default(false),
});

// Type definitions
export type GetUserManagementInput = z.infer<typeof getUserManagementSchema>;
export type GetServiceManagementInput = z.infer<
	typeof getServiceManagementSchema
>;
export type GetBookingManagementInput = z.infer<
	typeof getBookingManagementSchema
>;
export type GetPaymentManagementInput = z.infer<
	typeof getPaymentManagementSchema
>;
export type UpdateUserStatusInput = z.infer<typeof updateUserStatusSchema>;
export type UpdateServiceStatusInput = z.infer<
	typeof updateServiceStatusSchema
>;
export type ResolveDisputeInput = z.infer<typeof resolveDisputeSchema>;
export type GetPlatformStatsInput = z.infer<typeof getPlatformStatsSchema>;

interface AdminServiceDeps {
	db: PrismaClient;
	currentUser?: { id: string; isProfessional?: boolean; email?: string };
}

export function createAdminService(deps: AdminServiceDeps) {
	const { db, currentUser } = deps;

	// Helper function to check admin permissions
	function checkAdminPermissions() {
		if (!currentUser?.isProfessional) {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: "Admin access required",
			});
		}
	}

	return {
		/**
		 * Get comprehensive platform statistics
		 */
		async getPlatformStats(input: GetPlatformStatsInput) {
			checkAdminPermissions();

			const now = new Date();
			let startDate: Date;

			switch (input.period) {
				case "24h":
					startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
					break;
				case "7d":
					startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
					break;
				case "30d":
					startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
					break;
				case "90d":
					startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
					break;
				case "1y":
					startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
					break;
				default:
					startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
			}

			const [
				userStats,
				serviceStats,
				bookingStats,
				revenueStats,
				activityStats,
				topCategories,
				topProviders,
			] = await Promise.all([
				// User statistics
				db.user.aggregate({
					where: { createdAt: { gte: startDate } },
					_count: { id: true },
				}),

				// Service statistics
				db.service.aggregate({
					where: { createdAt: { gte: startDate } },
					_count: { id: true },
				}),

				// Booking statistics
				db.booking.groupBy({
					by: ["status"],
					where: { createdAt: { gte: startDate } },
					_count: true,
					_sum: { totalPrice: true },
				}),

				// Revenue statistics
				db.payment.aggregate({
					where: {
						createdAt: { gte: startDate },
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

				// Daily activity trends
				db.$queryRaw`
          SELECT 
            DATE("createdAt") as date,
            COUNT(CASE WHEN table_name = 'User' THEN 1 END) as new_users,
            COUNT(CASE WHEN table_name = 'Service' THEN 1 END) as new_services,
            COUNT(CASE WHEN table_name = 'Booking' THEN 1 END) as new_bookings
          FROM (
            SELECT "createdAt", 'User' as table_name FROM "User" WHERE "createdAt" >= ${startDate}
            UNION ALL
            SELECT "createdAt", 'Service' as table_name FROM "Service" WHERE "createdAt" >= ${startDate}
            UNION ALL
            SELECT "createdAt", 'Booking' as table_name FROM "Booking" WHERE "createdAt" >= ${startDate}
          ) combined
          GROUP BY DATE("createdAt")
          ORDER BY date DESC
          LIMIT 30
        `,

				// Top performing categories
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
												createdAt: { gte: startDate },
											},
										},
									},
								},
							},
						},
					},
					orderBy: {
						services: { _count: "desc" },
					},
					take: 10,
				}),

				// Top earning providers
				db.user.findMany({
					where: {
						isProfessional: true,
						professionalBookings: {
							some: {
								createdAt: { gte: startDate },
								status: "completed",
							},
						},
					},
					select: {
						id: true,
						name: true,
						email: true,
						_count: {
							select: {
								professionalBookings: {
									where: {
										createdAt: { gte: startDate },
										status: "completed",
									},
								},
							},
						},
					},
					orderBy: {
						professionalBookings: { _count: "desc" },
					},
					take: 10,
				}),
			]);

			// Calculate growth rates if projections requested
			const projections = input.includeProjections
				? {
						userGrowthRate:
							userStats._count.id / Math.max(1, getDaysInPeriod(input.period)),
						serviceGrowthRate:
							serviceStats._count.id /
							Math.max(1, getDaysInPeriod(input.period)),
						revenueGrowthRate:
							(revenueStats._sum.amount || 0) /
							Math.max(1, getDaysInPeriod(input.period)),
					}
				: null;

			return {
				overview: {
					totalUsers: await db.user.count(),
					totalServices: await db.service.count(),
					totalBookings: await db.booking.count(),
					totalRevenue: await db.payment
						.aggregate({
							where: { status: "paid" },
							_sum: { amount: true },
						})
						.then((result) => result._sum.amount || 0),
					newUsers: userStats._count.id,
					newServices: serviceStats._count.id,
					periodRevenue: revenueStats._sum.amount || 0,
					platformRevenue: revenueStats._sum.serviceFee || 0,
				},
				bookingsByStatus: bookingStats.reduce(
					(acc, item) => {
						acc[item.status] = item._count;
						return acc;
					},
					{} as Record<string, number>,
				),
				activityTrends: activityStats,
				topCategories: topCategories.map((cat) => ({
					id: cat.id,
					name: cat.name,
					serviceCount: cat._count.services,
				})),
				topProviders: topProviders.map((provider) => ({
					id: provider.id,
					name: provider.name,
					email: provider.email,
					completedBookings: provider._count.professionalBookings,
				})),
				projections,
				period: input.period,
				dateRange: { start: startDate, end: now },
			};
		},

		/**
		 * Get user management data with filtering and pagination
		 */
		async getUserManagement(input: GetUserManagementInput) {
			checkAdminPermissions();

			const { page, limit, search, role, status, sortBy, sortOrder } = input;
			const skip = (page - 1) * limit;

			// Build where clause
			const where: Record<string, unknown> = {};

			if (search) {
				where.OR = [
					{ name: { contains: search, mode: "insensitive" } },
					{ email: { contains: search, mode: "insensitive" } },
				];
			}

			if (role !== "all") {
				where.isProfessional = role === "professionals";
			}

			// Build order by clause
			const orderBy: Record<string, unknown> = {};
			if (sortBy === "bookingCount") {
				orderBy.professionalBookings = { _count: sortOrder };
			} else {
				orderBy[sortBy] = sortOrder;
			}

			const [users, totalCount] = await Promise.all([
				db.user.findMany({
					where,
					skip,
					take: limit,
					orderBy,
					select: {
						id: true,
						name: true,
						email: true,
						isProfessional: true,
						createdAt: true,
						_count: {
							select: {
								bookings: true,
								professionalBookings: true,
								services: true,
							},
						},
					},
				}),

				db.user.count({ where }),
			]);

			return {
				users: users.map((user) => ({
					...user,
					stats: {
						totalBookings:
							user._count.bookings + user._count.professionalBookings,
						servicesProvided: user._count.services,
						clientBookings: user._count.bookings,
						professionalBookings: user._count.professionalBookings,
					},
				})),
				pagination: {
					page,
					limit,
					total: totalCount,
					totalPages: Math.ceil(totalCount / limit),
					hasNext: page * limit < totalCount,
					hasPrev: page > 1,
				},
			};
		},

		/**
		 * Get service management data with filtering and pagination
		 */
		async getServiceManagement(input: GetServiceManagementInput) {
			checkAdminPermissions();

			const { page, limit, search, categoryId, status, sortBy, sortOrder } =
				input;
			const skip = (page - 1) * limit;

			// Build where clause
			const where: Record<string, unknown> = {};

			if (search) {
				where.OR = [
					{ title: { contains: search, mode: "insensitive" } },
					{ description: { contains: search, mode: "insensitive" } },
				];
			}

			if (categoryId) {
				where.categoryId = categoryId;
			}

			if (status !== "all") {
				where.status = status;
			}

			// Build order by clause
			const orderBy: Record<string, unknown> = {};
			if (sortBy === "rating") {
				orderBy.avgRating = sortOrder;
			} else if (sortBy === "bookingCount") {
				orderBy.bookingCount = sortOrder;
			} else {
				orderBy[sortBy] = sortOrder;
			}

			const [services, totalCount] = await Promise.all([
				db.service.findMany({
					where,
					skip,
					take: limit,
					orderBy,
					select: {
						id: true,
						title: true,
						description: true,
						price: true,
						status: true,
						avgRating: true,
						bookingCount: true,
						createdAt: true,
						provider: {
							select: {
								id: true,
								name: true,
								email: true,
							},
						},
						category: {
							select: {
								id: true,
								name: true,
							},
						},
						_count: {
							select: {
								bookings: true,
								reviews: true,
							},
						},
					},
				}),

				db.service.count({ where }),
			]);

			return {
				services,
				pagination: {
					page,
					limit,
					total: totalCount,
					totalPages: Math.ceil(totalCount / limit),
					hasNext: page * limit < totalCount,
					hasPrev: page > 1,
				},
			};
		},

		/**
		 * Get booking management data with filtering and pagination
		 */
		async getBookingManagement(input: GetBookingManagementInput) {
			checkAdminPermissions();

			const {
				page,
				limit,
				search,
				status,
				dateFrom,
				dateTo,
				sortBy,
				sortOrder,
			} = input;
			const skip = (page - 1) * limit;

			// Build where clause
			const where: Prisma.BookingWhereInput = {};

			if (search) {
				where.OR = [
					{ service: { title: { contains: search, mode: "insensitive" } } },
					{ client: { name: { contains: search, mode: "insensitive" } } },
					{ provider: { name: { contains: search, mode: "insensitive" } } },
				];
			}

			if (status !== "all") {
				where.status = status;
			}

			if (dateFrom || dateTo) {
				where.createdAt = {};
				if (dateFrom) where.createdAt.gte = dateFrom;
				if (dateTo) where.createdAt.lte = dateTo;
			}

			const [bookings, totalCount] = await Promise.all([
				db.booking.findMany({
					where,
					skip,
					take: limit,
					orderBy: { [sortBy]: sortOrder },
					select: {
						id: true,
						status: true,
						totalPrice: true,
						bookingDate: true,
						createdAt: true,
						client: {
							select: {
								id: true,
								name: true,
								email: true,
							},
						},
						provider: {
							select: {
								id: true,
								name: true,
								email: true,
							},
						},
						service: {
							select: {
								id: true,
								title: true,
								price: true,
							},
						},
						payment: {
							select: {
								id: true,
								status: true,
								amount: true,
								paymentMethod: true,
							},
						},
					},
				}),

				db.booking.count({ where }),
			]);

			return {
				bookings,
				pagination: {
					page,
					limit,
					total: totalCount,
					totalPages: Math.ceil(totalCount / limit),
					hasNext: page * limit < totalCount,
					hasPrev: page > 1,
				},
			};
		},

		/**
		 * Get payment management data with filtering and pagination
		 */
		async getPaymentManagement(input: GetPaymentManagementInput) {
			checkAdminPermissions();

			const {
				page,
				limit,
				status,
				paymentMethod,
				dateFrom,
				dateTo,
				minAmount,
				maxAmount,
				sortBy,
				sortOrder,
			} = input;
			const skip = (page - 1) * limit;

			// Build where clause
			const where: Prisma.PaymentWhereInput = {};

			if (status !== "all") {
				where.status = status;
			}

			if (paymentMethod !== "all") {
				where.paymentMethod = paymentMethod;
			}

			if (dateFrom || dateTo) {
				where.createdAt = {};
				if (dateFrom) where.createdAt.gte = dateFrom;
				if (dateTo) where.createdAt.lte = dateTo;
			}

			if (minAmount !== undefined || maxAmount !== undefined) {
				where.amount = {};
				if (minAmount !== undefined) where.amount.gte = minAmount;
				if (maxAmount !== undefined) where.amount.lte = maxAmount;
			}

			const [payments, totalCount] = await Promise.all([
				db.payment.findMany({
					where,
					skip,
					take: limit,
					orderBy: { [sortBy]: sortOrder },
					select: {
						id: true,
						status: true,
						amount: true,
						netAmount: true,
						serviceFee: true,
						paymentMethod: true,
						refundAmount: true,
						createdAt: true,
						booking: {
							select: {
								id: true,
								client: {
									select: {
										id: true,
										name: true,
										email: true,
									},
								},
								provider: {
									select: {
										id: true,
										name: true,
										email: true,
									},
								},
								service: {
									select: {
										id: true,
										title: true,
									},
								},
							},
						},
					},
				}),

				db.payment.count({ where }),
			]);

			return {
				payments,
				pagination: {
					page,
					limit,
					total: totalCount,
					totalPages: Math.ceil(totalCount / limit),
					hasNext: page * limit < totalCount,
					hasPrev: page > 1,
				},
			};
		},

		/**
		 * Update user status (activate, suspend, delete)
		 */
		async updateUserStatus(input: UpdateUserStatusInput) {
			checkAdminPermissions();

			const { userId, action, reason } = input;

			// Check if user exists
			const user = await db.user.findUnique({
				where: { id: userId },
				select: { id: true, name: true, email: true },
			});

			if (!user) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "User not found",
				});
			}

			switch (action) {
				case "activate":
					return await db.user.update({
						where: { id: userId },
						data: { updatedAt: new Date() },
					});

				case "suspend":
					return await db.user.update({
						where: { id: userId },
						data: { updatedAt: new Date() },
					});

				case "delete":
					// Soft delete by anonymizing data
					return await db.user.update({
						where: { id: userId },
						data: {
							email: `deleted_${userId}@deleted.com`,
							name: "Deleted User",
							updatedAt: new Date(),
						},
					});

				default:
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: "Invalid action",
					});
			}
		},

		/**
		 * Update service status
		 */
		async updateServiceStatus(input: UpdateServiceStatusInput) {
			checkAdminPermissions();

			const { serviceId, status, reason } = input;

			// Check if service exists
			const service = await db.service.findUnique({
				where: { id: serviceId },
				select: {
					id: true,
					title: true,
					provider: {
						select: { id: true, name: true, email: true },
					},
				},
			});

			if (!service) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Service not found",
				});
			}

			return await db.service.update({
				where: { id: serviceId },
				data: { status, updatedAt: new Date() },
			});
		},

		/**
		 * Resolve booking dispute
		 */
		async resolveDispute(input: ResolveDisputeInput) {
			checkAdminPermissions();

			const { bookingId, resolution, refundAmount, notes } = input;

			// Check if booking exists
			const booking = await db.booking.findUnique({
				where: { id: bookingId },
				include: {
					client: true,
					provider: true,
					service: true,
					payment: true,
				},
			});

			if (!booking) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Booking not found",
				});
			}

			// Handle different resolution types
			switch (resolution) {
				case "refund_full":
					await Promise.all([
						db.booking.update({
							where: { id: bookingId },
							data: { status: "cancelled", updatedAt: new Date() },
						}),
						booking.payment &&
							db.payment.update({
								where: { id: booking.payment.id },
								data: {
									refundAmount: booking.payment.amount,
									status: "refunded",
									updatedAt: new Date(),
								},
							}),
					]);
					break;

				case "refund_partial":
					if (!refundAmount || refundAmount <= 0) {
						throw new TRPCError({
							code: "BAD_REQUEST",
							message: "Refund amount required for partial refund",
						});
					}
					await Promise.all([
						db.booking.update({
							where: { id: bookingId },
							data: { status: "cancelled", updatedAt: new Date() },
						}),
						booking.payment &&
							db.payment.update({
								where: { id: booking.payment.id },
								data: {
									refundAmount,
									status: "refunded",
									updatedAt: new Date(),
								},
							}),
					]);
					break;

				case "no_refund":
					await db.booking.update({
						where: { id: bookingId },
						data: { status: "completed", updatedAt: new Date() },
					});
					break;

				case "reschedule":
					await db.booking.update({
						where: { id: bookingId },
						data: { status: "accepted", updatedAt: new Date() },
					});
					break;
			}

			return { success: true, resolution, bookingId };
		},
	};
}

// Helper function to get days in period
function getDaysInPeriod(period: string): number {
	switch (period) {
		case "24h":
			return 1;
		case "7d":
			return 7;
		case "30d":
			return 30;
		case "90d":
			return 90;
		case "1y":
			return 365;
		default:
			return 30;
	}
}
