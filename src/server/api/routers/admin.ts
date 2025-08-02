import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

// TODO: Implement proper admin role checking
// For now, this is a placeholder for future admin functionality
const isAdmin = (userId: string): boolean => {
	// In production, this should check user roles/permissions
	// For now, return false to prevent access
	return false;
};

export const adminRouter = createTRPCRouter({
	// Get dashboard overview (admin only)
	getDashboard: protectedProcedure.query(async ({ ctx }) => {
		if (!isAdmin(ctx.session.user.id)) {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: "Admin access required",
			});
		}

		const now = new Date();
		const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
		const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
		const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

		// Get platform statistics
		const [
			totalUsers,
			newUsersThisMonth,
			newUsersLastMonth,
			totalProfessionals,
			totalServices,
			activeServices,
			totalBookings,
			completedBookings,
			totalRevenue,
			monthlyRevenue,
		] = await Promise.all([
			ctx.db.user.count(),
			ctx.db.user.count({
				where: { createdAt: { gte: startOfMonth } },
			}),
			ctx.db.user.count({
				where: {
					createdAt: {
						gte: startOfLastMonth,
						lte: endOfLastMonth,
					},
				},
			}),
			ctx.db.user.count({
				where: { isProfessional: true },
			}),
			ctx.db.service.count(),
			ctx.db.service.count({
				where: { status: "active" },
			}),
			ctx.db.booking.count(),
			ctx.db.booking.count({
				where: { status: "completed" },
			}),
			ctx.db.payment.aggregate({
				where: { status: "paid" },
				_sum: { serviceFee: true },
			}),
			ctx.db.payment.aggregate({
				where: {
					status: "paid",
					createdAt: { gte: startOfMonth },
				},
				_sum: { serviceFee: true },
			}),
		]);

		// Calculate growth rates
		const userGrowth =
			newUsersLastMonth > 0
				? ((newUsersThisMonth - newUsersLastMonth) / newUsersLastMonth) * 100
				: newUsersThisMonth > 0
					? 100
					: 0;

		return {
			users: {
				total: totalUsers,
				professionals: totalProfessionals,
				newThisMonth: newUsersThisMonth,
				growth: userGrowth,
			},
			services: {
				total: totalServices,
				active: activeServices,
				inactiveCount: totalServices - activeServices,
			},
			bookings: {
				total: totalBookings,
				completed: completedBookings,
				completionRate:
					totalBookings > 0 ? (completedBookings / totalBookings) * 100 : 0,
			},
			revenue: {
				total: totalRevenue._sum.serviceFee || 0,
				thisMonth: monthlyRevenue._sum.serviceFee || 0,
			},
		};
	}),

	// Get users list (admin only)
	getUsers: protectedProcedure
		.input(
			z.object({
				limit: z.number().min(1).max(100).default(20),
				cursor: z.string().optional(),
				search: z.string().optional(),
				role: z.enum(["all", "client", "professional"]).default("all"),
			}),
		)
		.query(async ({ ctx, input }) => {
			if (!isAdmin(ctx.session.user.id)) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Admin access required",
				});
			}

			const where: Record<string, unknown> = {};

			if (input.search) {
				where.OR = [
					{ name: { contains: input.search, mode: "insensitive" } },
					{ email: { contains: input.search, mode: "insensitive" } },
				];
			}

			if (input.role === "professional") {
				where.isProfessional = true;
			} else if (input.role === "client") {
				where.isProfessional = false;
			}

			const users = await ctx.db.user.findMany({
				where,
				take: input.limit + 1,
				cursor: input.cursor ? { id: input.cursor } : undefined,
				orderBy: { createdAt: "desc" },
				select: {
					id: true,
					name: true,
					email: true,
					image: true,
					isProfessional: true,
					accountBalance: true,
					createdAt: true,
					_count: {
						select: {
							services: true,
							professionalBookings: true,
							bookings: true,
						},
					},
				},
			});

			let nextCursor: typeof input.cursor | undefined = undefined;
			if (users.length > input.limit) {
				const nextItem = users.pop();
				nextCursor = nextItem?.id;
			}

			return {
				users,
				nextCursor,
			};
		}),

	// Get services list (admin only)
	getServices: protectedProcedure
		.input(
			z.object({
				limit: z.number().min(1).max(100).default(20),
				cursor: z.string().optional(),
				search: z.string().optional(),
				status: z.enum(["all", "active", "inactive"]).default("all"),
				categoryId: z.string().cuid().optional(),
			}),
		)
		.query(async ({ ctx, input }) => {
			if (!isAdmin(ctx.session.user.id)) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Admin access required",
				});
			}

			const where: Record<string, unknown> = {};

			if (input.search) {
				where.OR = [
					{ title: { contains: input.search, mode: "insensitive" } },
					{ description: { contains: input.search, mode: "insensitive" } },
				];
			}

			if (input.status !== "all") {
				where.status = input.status;
			}

			if (input.categoryId) {
				where.categoryId = input.categoryId;
			}

			const services = await ctx.db.service.findMany({
				where,
				take: input.limit + 1,
				cursor: input.cursor ? { id: input.cursor } : undefined,
				orderBy: { createdAt: "desc" },
				include: {
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
			});

			let nextCursor: typeof input.cursor | undefined = undefined;
			if (services.length > input.limit) {
				const nextItem = services.pop();
				nextCursor = nextItem?.id;
			}

			return {
				services,
				nextCursor,
			};
		}),

	// Get bookings list (admin only)
	getBookings: protectedProcedure
		.input(
			z.object({
				limit: z.number().min(1).max(100).default(20),
				cursor: z.string().optional(),
				status: z
					.enum([
						"all",
						"pending",
						"accepted",
						"declined",
						"completed",
						"cancelled",
					])
					.default("all"),
				search: z.string().optional(),
			}),
		)
		.query(async ({ ctx, input }) => {
			if (!isAdmin(ctx.session.user.id)) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Admin access required",
				});
			}

			const where: Record<string, unknown> = {};

			if (input.status !== "all") {
				where.status = input.status;
			}

			if (input.search) {
				where.OR = [
					{ client: { name: { contains: input.search, mode: "insensitive" } } },
					{
						provider: { name: { contains: input.search, mode: "insensitive" } },
					},
					{
						service: { title: { contains: input.search, mode: "insensitive" } },
					},
				];
			}

			const bookings = await ctx.db.booking.findMany({
				where,
				take: input.limit + 1,
				cursor: input.cursor ? { id: input.cursor } : undefined,
				orderBy: { createdAt: "desc" },
				include: {
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
					payment: {
						select: {
							id: true,
							amount: true,
							status: true,
						},
					},
				},
			});

			let nextCursor: typeof input.cursor | undefined = undefined;
			if (bookings.length > input.limit) {
				const nextItem = bookings.pop();
				nextCursor = nextItem?.id;
			}

			return {
				bookings,
				nextCursor,
			};
		}),

	// Get platform analytics (admin only)
	getAnalytics: protectedProcedure
		.input(
			z.object({
				period: z.enum(["7d", "30d", "90d", "1y"]).default("30d"),
			}),
		)
		.query(async ({ ctx, input }) => {
			if (!isAdmin(ctx.session.user.id)) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Admin access required",
				});
			}

			// Calculate date range
			const now = new Date();
			const daysAgo = {
				"7d": 7,
				"30d": 30,
				"90d": 90,
				"1y": 365,
			}[input.period];

			const startDate = new Date();
			startDate.setDate(startDate.getDate() - daysAgo);

			// Get analytics data
			const [
				userSignups,
				serviceCreations,
				bookingCreations,
				completedBookings,
				payments,
			] = await Promise.all([
				ctx.db.user.findMany({
					where: { createdAt: { gte: startDate } },
					select: { createdAt: true },
				}),
				ctx.db.service.findMany({
					where: { createdAt: { gte: startDate } },
					select: { createdAt: true },
				}),
				ctx.db.booking.findMany({
					where: { createdAt: { gte: startDate } },
					select: { createdAt: true, status: true },
				}),
				ctx.db.booking.findMany({
					where: {
						completedAt: { gte: startDate },
						status: "completed",
					},
					select: { completedAt: true, createdAt: true },
				}),
				ctx.db.payment.findMany({
					where: {
						createdAt: { gte: startDate },
						status: "paid",
					},
					select: { createdAt: true, serviceFee: true },
				}),
			]);

			// Group data by day
			const groupByDay = (
				data: Array<{
					createdAt?: Date | null;
					completedAt?: Date | null;
					[key: string]: unknown;
				}>,
				valueKey?: string,
			) => {
				return data.reduce(
					(acc, item) => {
						const date = item.createdAt || item.completedAt;
						if (!date) return acc;

						const dayKey = date.toISOString().slice(0, 10);
						if (!acc[dayKey]) {
							acc[dayKey] = 0;
						}

						if (valueKey && typeof item[valueKey] === "number") {
							acc[dayKey] += item[valueKey] as number;
						} else {
							acc[dayKey]++;
						}

						return acc;
					},
					{} as Record<string, number>,
				);
			};

			return {
				userSignups: groupByDay(userSignups),
				serviceCreations: groupByDay(serviceCreations),
				bookingCreations: groupByDay(bookingCreations),
				completedBookings: groupByDay(completedBookings),
				revenue: groupByDay(payments, "serviceFee"),
			};
		}),

	// Moderate content (admin only)
	moderateService: protectedProcedure
		.input(
			z.object({
				serviceId: z.string().cuid(),
				action: z.enum(["approve", "reject", "suspend"]),
				reason: z.string().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			if (!isAdmin(ctx.session.user.id)) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Admin access required",
				});
			}

			const service = await ctx.db.service.findUnique({
				where: { id: input.serviceId },
				include: { provider: true },
			});

			if (!service) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Service not found",
				});
			}

			let newStatus: "active" | "inactive";
			let notificationType: string;
			let notificationMessage: string;

			switch (input.action) {
				case "approve":
					newStatus = "active";
					notificationType = "service_approved";
					notificationMessage = `Your service "${service.title}" has been approved`;
					break;
				case "reject":
				case "suspend":
					newStatus = "inactive";
					notificationType =
						input.action === "reject"
							? "service_rejected"
							: "service_suspended";
					notificationMessage = `Your service "${service.title}" has been ${input.action}d${
						input.reason ? `: ${input.reason}` : ""
					}`;
					break;
			}

			// Update service status
			const updatedService = await ctx.db.service.update({
				where: { id: input.serviceId },
				data: { status: newStatus },
			});

			// Create notification for provider
			await ctx.db.notification.create({
				data: {
					userId: service.providerId,
					type: notificationType,
					title: `Service ${input.action}d`,
					message: notificationMessage,
				},
			});

			return updatedService;
		}),

	// Suspend user (admin only)
	suspendUser: protectedProcedure
		.input(
			z.object({
				userId: z.string().cuid(),
				reason: z.string().min(10),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			if (!isAdmin(ctx.session.user.id)) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Admin access required",
				});
			}

			const user = await ctx.db.user.findUnique({
				where: { id: input.userId },
			});

			if (!user) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "User not found",
				});
			}

			// For now, we'll deactivate all user's services and notify them
			// In a real implementation, you'd add a suspended field to the User model
			await ctx.db.$transaction(async (tx) => {
				// Deactivate all user's services
				await tx.service.updateMany({
					where: { providerId: input.userId },
					data: { status: "inactive" },
				});

				// Cancel pending bookings as provider
				await tx.booking.updateMany({
					where: {
						providerId: input.userId,
						status: { in: ["pending", "accepted"] },
					},
					data: {
						status: "cancelled",
						cancellationReason: `Service suspended: ${input.reason}`,
						cancelledBy: ctx.session.user.id,
					},
				});

				// Create notification
				await tx.notification.create({
					data: {
						userId: input.userId,
						type: "account_suspended",
						title: "Account Suspended",
						message: `Your account has been suspended: ${input.reason}`,
					},
				});
			});

			return { success: true };
		}),
});
