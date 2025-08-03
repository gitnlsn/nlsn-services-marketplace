import type { PrismaClient } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import type { Session } from "next-auth";
import { z } from "zod";

// Service dependencies
interface NotificationDbServiceDependencies {
	db: PrismaClient;
	currentUser?: Session["user"];
}

// Input types
export type ListNotificationsInput = z.infer<typeof listNotificationsSchema>;
export type MarkAsReadInput = z.infer<typeof markAsReadSchema>;
export type BulkUpdateInput = z.infer<typeof bulkUpdateSchema>;
export type CreateNotificationInput = z.infer<typeof createNotificationSchema>;
export type DeleteNotificationInput = z.infer<typeof deleteNotificationSchema>;
export type UpdatePreferencesInput = z.infer<typeof updatePreferencesSchema>;
export type GetStatsInput = z.infer<typeof getStatsSchema>;

// Schemas
export const listNotificationsSchema = z.object({
	limit: z.number().min(1).max(100).default(20),
	cursor: z.string().optional(),
	status: z.enum(["read", "unread", "all"]).default("all"),
});

export const markAsReadSchema = z.object({
	notificationId: z.string().cuid(),
});

export const bulkUpdateSchema = z.object({
	notificationIds: z.array(z.string().cuid()),
	action: z.enum(["read", "unread", "delete"]),
});

export const createNotificationSchema = z.object({
	userId: z.string().cuid(),
	type: z.string(),
	title: z.string(),
	message: z.string(),
	status: z.enum(["read", "unread"]).default("unread"),
});

export const deleteNotificationSchema = z.object({
	notificationId: z.string().cuid(),
});

export const getStatsSchema = z.object({
	userId: z.string().cuid().optional(),
});

export const updatePreferencesSchema = z.object({
	email: z.boolean().optional(),
	sms: z.boolean().optional(),
	whatsapp: z.boolean().optional(),
	push: z.boolean().optional(),
});

export class NotificationDbService {
	constructor(private deps: NotificationDbServiceDependencies) {}

	async list(input: ListNotificationsInput) {
		if (!this.deps.currentUser) {
			throw new TRPCError({
				code: "UNAUTHORIZED",
				message: "User not authenticated",
			});
		}

		const where = {
			userId: this.deps.currentUser.id,
			...(input.status !== "all" && {
				read: input.status === "read",
			}),
		};

		const notifications = await this.deps.db.notification.findMany({
			where,
			take: input.limit + 1,
			cursor: input.cursor ? { id: input.cursor } : undefined,
			orderBy: { createdAt: "desc" },
			include: {
				user: {
					select: {
						id: true,
						name: true,
						image: true,
					},
				},
			},
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
	}

	async getUnreadCount() {
		if (!this.deps.currentUser) {
			throw new TRPCError({
				code: "UNAUTHORIZED",
				message: "User not authenticated",
			});
		}

		const count = await this.deps.db.notification.count({
			where: {
				userId: this.deps.currentUser.id,
				read: false,
			},
		});

		return { count };
	}

	async markAsRead(input: MarkAsReadInput) {
		if (!this.deps.currentUser) {
			throw new TRPCError({
				code: "UNAUTHORIZED",
				message: "User not authenticated",
			});
		}

		const notification = await this.deps.db.notification.findFirst({
			where: {
				id: input.notificationId,
				userId: this.deps.currentUser.id,
			},
		});

		if (!notification) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Notification not found",
			});
		}

		const updated = await this.deps.db.notification.update({
			where: { id: input.notificationId },
			data: { read: true },
		});

		return updated;
	}

	async markAllAsRead() {
		if (!this.deps.currentUser) {
			throw new TRPCError({
				code: "UNAUTHORIZED",
				message: "User not authenticated",
			});
		}

		const result = await this.deps.db.notification.updateMany({
			where: {
				userId: this.deps.currentUser.id,
				read: false,
			},
			data: { read: true },
		});

		return { count: result.count };
	}

	async delete(input: DeleteNotificationInput) {
		if (!this.deps.currentUser) {
			throw new TRPCError({
				code: "UNAUTHORIZED",
				message: "User not authenticated",
			});
		}

		const notification = await this.deps.db.notification.findFirst({
			where: {
				id: input.notificationId,
				userId: this.deps.currentUser.id,
			},
		});

		if (!notification) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Notification not found",
			});
		}

		await this.deps.db.notification.delete({
			where: { id: input.notificationId },
		});

		return { success: true };
	}

	async deleteAll() {
		if (!this.deps.currentUser) {
			throw new TRPCError({
				code: "UNAUTHORIZED",
				message: "User not authenticated",
			});
		}

		const result = await this.deps.db.notification.deleteMany({
			where: {
				userId: this.deps.currentUser.id,
			},
		});

		return { count: result.count };
	}

	async bulkUpdate(input: BulkUpdateInput) {
		if (!this.deps.currentUser) {
			throw new TRPCError({
				code: "UNAUTHORIZED",
				message: "User not authenticated",
			});
		}

		// Verify all notifications belong to the user
		const notifications = await this.deps.db.notification.findMany({
			where: {
				id: { in: input.notificationIds },
				userId: this.deps.currentUser.id,
			},
		});

		if (notifications.length !== input.notificationIds.length) {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: "Some notifications not found or don't belong to user",
			});
		}

		if (input.action === "delete") {
			const result = await this.deps.db.notification.deleteMany({
				where: {
					id: { in: input.notificationIds },
				},
			});
			return { count: result.count, action: "deleted" };
		}

		const result = await this.deps.db.notification.updateMany({
			where: {
				id: { in: input.notificationIds },
			},
			data: {
				read: input.action === "read",
			},
		});

		return { count: result.count, action: input.action };
	}

	async getTypeStats() {
		if (!this.deps.currentUser) {
			throw new TRPCError({
				code: "UNAUTHORIZED",
				message: "User not authenticated",
			});
		}

		const stats = await this.deps.db.notification.groupBy({
			by: ["type", "read"],
			where: {
				userId: this.deps.currentUser.id,
			},
			_count: true,
		});

		return stats;
	}

	async create(input: CreateNotificationInput) {
		const notification = await this.deps.db.notification.create({
			data: {
				userId: input.userId,
				type: input.type,
				title: input.title,
				message: input.message,
				read: input.status === "read",
			},
		});

		return notification;
	}

	async getPreferences() {
		if (!this.deps.currentUser) {
			throw new TRPCError({
				code: "UNAUTHORIZED",
				message: "User not authenticated",
			});
		}

		const user = await this.deps.db.user.findUnique({
			where: { id: this.deps.currentUser.id },
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

		return {
			email: user.notificationEmail,
			sms: user.notificationSms,
			whatsapp: user.notificationWhatsapp,
			push: false, // Not implemented yet
		};
	}

	async updatePreferences(input: UpdatePreferencesInput) {
		if (!this.deps.currentUser) {
			throw new TRPCError({
				code: "UNAUTHORIZED",
				message: "User not authenticated",
			});
		}

		const data: Record<string, boolean> = {};
		if (input.email !== undefined) data.notificationEmail = input.email;
		if (input.sms !== undefined) data.notificationSms = input.sms;
		if (input.whatsapp !== undefined)
			data.notificationWhatsapp = input.whatsapp;

		const user = await this.deps.db.user.update({
			where: { id: this.deps.currentUser.id },
			data,
			select: {
				notificationEmail: true,
				notificationSms: true,
				notificationWhatsapp: true,
			},
		});

		return {
			email: user.notificationEmail,
			sms: user.notificationSms,
			whatsapp: user.notificationWhatsapp,
			push: false,
		};
	}

	async getStats(input: GetStatsInput) {
		const userId = input.userId || this.deps.currentUser?.id;

		if (!userId) {
			throw new TRPCError({
				code: "UNAUTHORIZED",
				message: "User not authenticated",
			});
		}

		const [total, unread, read] = await Promise.all([
			this.deps.db.notification.count({
				where: { userId },
			}),
			this.deps.db.notification.count({
				where: { userId, read: false },
			}),
			this.deps.db.notification.count({
				where: { userId, read: true },
			}),
		]);

		return {
			total,
			unread,
			read,
		};
	}
}

export function createNotificationDbService(
	deps: NotificationDbServiceDependencies,
): NotificationDbService {
	return new NotificationDbService(deps);
}
