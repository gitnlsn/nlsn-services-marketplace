import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import {
	bulkUpdateSchema,
	createNotificationSchema,
	createNotificationService,
	deleteNotificationSchema,
	getStatsSchema,
	listNotificationsSchema,
	markAsReadSchema,
	updatePreferencesSchema,
} from "~/server/services/notification-service";

export const notificationRouter = createTRPCRouter({
	// Get user's notifications
	list: protectedProcedure
		.input(listNotificationsSchema)
		.query(async ({ ctx, input }) => {
			const notificationService = createNotificationService({
				db: ctx.db,
				currentUser: ctx.session.user,
			});
			return await notificationService.list(input);
		}),

	// Get unread count
	getUnreadCount: protectedProcedure.query(async ({ ctx }) => {
		const notificationService = createNotificationService({
			db: ctx.db,
			currentUser: ctx.session.user,
		});
		return await notificationService.getUnreadCount();
	}),

	// Mark notification as read
	markAsRead: protectedProcedure
		.input(markAsReadSchema)
		.mutation(async ({ ctx, input }) => {
			const notificationService = createNotificationService({
				db: ctx.db,
				currentUser: ctx.session.user,
			});
			return await notificationService.markAsRead(input);
		}),

	// Mark all notifications as read
	markAllAsRead: protectedProcedure.mutation(async ({ ctx }) => {
		const notificationService = createNotificationService({
			db: ctx.db,
			currentUser: ctx.session.user,
		});
		return await notificationService.markAllAsRead();
	}),

	// Delete notification
	delete: protectedProcedure
		.input(deleteNotificationSchema)
		.mutation(async ({ ctx, input }) => {
			const notificationService = createNotificationService({
				db: ctx.db,
				currentUser: ctx.session.user,
			});
			return await notificationService.delete(input);
		}),

	// Delete all notifications
	deleteAll: protectedProcedure.mutation(async ({ ctx }) => {
		const notificationService = createNotificationService({
			db: ctx.db,
			currentUser: ctx.session.user,
		});
		return await notificationService.deleteAll();
	}),

	// Bulk mark notifications as read/unread
	bulkUpdate: protectedProcedure
		.input(bulkUpdateSchema)
		.mutation(async ({ ctx, input }) => {
			const notificationService = createNotificationService({
				db: ctx.db,
				currentUser: ctx.session.user,
			});
			return await notificationService.bulkUpdate(input);
		}),

	// Get notification types and their counts
	getTypeStats: protectedProcedure.query(async ({ ctx }) => {
		const notificationService = createNotificationService({
			db: ctx.db,
			currentUser: ctx.session.user,
		});
		return await notificationService.getTypeStats();
	}),

	// Create notification (internal use)
	create: protectedProcedure
		.input(createNotificationSchema)
		.mutation(async ({ ctx, input }) => {
			const notificationService = createNotificationService({
				db: ctx.db,
				currentUser: ctx.session.user,
			});
			return await notificationService.create(input);
		}),

	// Get notification preferences
	getPreferences: protectedProcedure.query(async ({ ctx }) => {
		const notificationService = createNotificationService({
			db: ctx.db,
			currentUser: ctx.session.user,
		});
		return await notificationService.getPreferences();
	}),

	// Update notification preferences
	updatePreferences: protectedProcedure
		.input(updatePreferencesSchema)
		.mutation(async ({ ctx, input }) => {
			const notificationService = createNotificationService({
				db: ctx.db,
				currentUser: ctx.session.user,
			});
			return await notificationService.updatePreferences(input);
		}),

	// Get notification statistics (for admin)
	getStats: protectedProcedure
		.input(getStatsSchema)
		.query(async ({ ctx, input }) => {
			const notificationService = createNotificationService({
				db: ctx.db,
				currentUser: ctx.session.user,
			});
			return await notificationService.getStats(input);
		}),
});
