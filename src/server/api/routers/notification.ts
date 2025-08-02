import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const notificationRouter = createTRPCRouter({
	// Get user's notifications
	list: protectedProcedure
		.input(
			z.object({
				limit: z.number().min(1).max(50).default(20),
				cursor: z.string().optional(),
				unreadOnly: z.boolean().default(false),
			}),
		)
		.query(async ({ ctx, input }) => {
			const where: { userId: string; read?: boolean } = {
				userId: ctx.session.user.id,
			};

			if (input.unreadOnly) {
				where.read = false;
			}

			const notifications = await ctx.db.notification.findMany({
				where,
				take: input.limit + 1,
				cursor: input.cursor ? { id: input.cursor } : undefined,
				orderBy: { createdAt: "desc" },
			});

			let nextCursor: typeof input.cursor | undefined = undefined;
			if (notifications.length > input.limit) {
				const nextItem = notifications.pop();
				nextCursor = nextItem?.id;
			}

			return {
				notifications,
				nextCursor,
			};
		}),

	// Get unread count
	getUnreadCount: protectedProcedure.query(async ({ ctx }) => {
		const count = await ctx.db.notification.count({
			where: {
				userId: ctx.session.user.id,
				read: false,
			},
		});

		return { count };
	}),

	// Mark notification as read
	markAsRead: protectedProcedure
		.input(
			z.object({
				notificationId: z.string().cuid(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// Verify notification belongs to user
			const notification = await ctx.db.notification.findFirst({
				where: {
					id: input.notificationId,
					userId: ctx.session.user.id,
				},
			});

			if (!notification) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Notification not found",
				});
			}

			const updatedNotification = await ctx.db.notification.update({
				where: { id: input.notificationId },
				data: { read: true },
			});

			return updatedNotification;
		}),

	// Mark all notifications as read
	markAllAsRead: protectedProcedure.mutation(async ({ ctx }) => {
		await ctx.db.notification.updateMany({
			where: {
				userId: ctx.session.user.id,
				read: false,
			},
			data: { read: true },
		});

		return { success: true };
	}),

	// Delete notification
	delete: protectedProcedure
		.input(
			z.object({
				notificationId: z.string().cuid(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// Verify notification belongs to user
			const notification = await ctx.db.notification.findFirst({
				where: {
					id: input.notificationId,
					userId: ctx.session.user.id,
				},
			});

			if (!notification) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Notification not found",
				});
			}

			await ctx.db.notification.delete({
				where: { id: input.notificationId },
			});

			return { success: true };
		}),

	// Delete all notifications
	deleteAll: protectedProcedure.mutation(async ({ ctx }) => {
		await ctx.db.notification.deleteMany({
			where: {
				userId: ctx.session.user.id,
			},
		});

		return { success: true };
	}),

	// Bulk mark notifications as read/unread
	bulkUpdate: protectedProcedure
		.input(
			z.object({
				notificationIds: z.array(z.string().cuid()).min(1).max(50),
				action: z.enum(["mark_read", "mark_unread", "delete"]),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// Verify all notifications belong to user
			const notifications = await ctx.db.notification.findMany({
				where: {
					id: { in: input.notificationIds },
					userId: ctx.session.user.id,
				},
				select: { id: true },
			});

			if (notifications.length !== input.notificationIds.length) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Some notifications not found or don't belong to user",
				});
			}

			switch (input.action) {
				case "mark_read":
					await ctx.db.notification.updateMany({
						where: { id: { in: input.notificationIds } },
						data: { read: true },
					});
					break;
				case "mark_unread":
					await ctx.db.notification.updateMany({
						where: { id: { in: input.notificationIds } },
						data: { read: false },
					});
					break;
				case "delete":
					await ctx.db.notification.deleteMany({
						where: { id: { in: input.notificationIds } },
					});
					break;
			}

			return { success: true, affected: notifications.length };
		}),

	// Get notification types and their counts
	getTypeStats: protectedProcedure.query(async ({ ctx }) => {
		const typeStats = await ctx.db.notification.groupBy({
			by: ["type"],
			where: { userId: ctx.session.user.id },
			_count: { type: true },
		});

		return typeStats.map((stat) => ({
			type: stat.type,
			count: stat._count.type,
		}));
	}),

	// Create notification (internal use)
	create: protectedProcedure
		.input(
			z.object({
				userId: z.string().cuid(),
				type: z.string(),
				title: z.string().min(1).max(100),
				message: z.string().min(1).max(500),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// TODO: Add admin check or internal service authentication
			// This should primarily be used by internal services

			const notification = await ctx.db.notification.create({
				data: input,
			});

			return notification;
		}),

	// Get notification preferences
	getPreferences: protectedProcedure.query(async ({ ctx }) => {
		const user = await ctx.db.user.findUnique({
			where: { id: ctx.session.user.id },
			select: {
				notificationEmail: true,
				notificationSms: true,
				notificationWhatsapp: true,
			},
		});

		if (!user) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "User not found",
			});
		}

		return user;
	}),

	// Update notification preferences
	updatePreferences: protectedProcedure
		.input(
			z.object({
				notificationEmail: z.boolean().optional(),
				notificationSms: z.boolean().optional(),
				notificationWhatsapp: z.boolean().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const user = await ctx.db.user.update({
				where: { id: ctx.session.user.id },
				data: input,
				select: {
					notificationEmail: true,
					notificationSms: true,
					notificationWhatsapp: true,
				},
			});

			return user;
		}),

	// Get notification statistics (for admin)
	getStats: protectedProcedure
		.input(
			z.object({
				days: z.number().min(1).max(365).default(30),
			}),
		)
		.query(async ({ ctx, input }) => {
			// TODO: Add admin check when admin roles are implemented

			const startDate = new Date();
			startDate.setDate(startDate.getDate() - input.days);

			// Get notification statistics
			const [
				totalNotifications,
				unreadNotifications,
				notificationsByType,
				notificationsByDay,
			] = await Promise.all([
				ctx.db.notification.count({
					where: {
						createdAt: { gte: startDate },
					},
				}),
				ctx.db.notification.count({
					where: {
						createdAt: { gte: startDate },
						read: false,
					},
				}),
				ctx.db.notification.groupBy({
					by: ["type"],
					where: {
						createdAt: { gte: startDate },
					},
					_count: { type: true },
				}),
				ctx.db.notification.findMany({
					where: {
						createdAt: { gte: startDate },
					},
					select: {
						createdAt: true,
						type: true,
					},
				}),
			]);

			// Group notifications by day
			const dailyStats = notificationsByDay.reduce(
				(acc, notification) => {
					const dayKey = notification.createdAt.toISOString().slice(0, 10); // YYYY-MM-DD
					if (!acc[dayKey]) {
						acc[dayKey] = { total: 0, byType: {} };
					}
					acc[dayKey].total++;
					acc[dayKey].byType[notification.type] =
						(acc[dayKey].byType[notification.type] || 0) + 1;
					return acc;
				},
				{} as Record<string, { total: number; byType: Record<string, number> }>,
			);

			return {
				totalNotifications,
				unreadNotifications,
				readRate:
					totalNotifications > 0
						? ((totalNotifications - unreadNotifications) /
								totalNotifications) *
							100
						: 0,
				byType: notificationsByType.reduce(
					(acc, item) => {
						acc[item.type] = item._count.type;
						return acc;
					},
					{} as Record<string, number>,
				),
				dailyStats,
			};
		}),
});
