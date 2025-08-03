import type { PrismaClient } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import type { Session } from "next-auth";
import { z } from "zod";

// Input schemas
export const createConversationSchema = z.object({
	participantTwoId: z.string().cuid(),
	bookingId: z.string().cuid().optional(),
});

export const getMessagesSchema = z.object({
	conversationId: z.string().cuid(),
	limit: z.number().min(1).max(100).default(50),
	cursor: z.string().cuid().optional(),
});

export const sendMessageSchema = z.object({
	conversationId: z.string().cuid(),
	content: z.string().min(1).max(1000),
	messageType: z.enum(["text", "image", "file"]).default("text"),
});

export const markAsReadSchema = z.object({
	conversationId: z.string().cuid(),
	messageIds: z.array(z.string().cuid()).optional(),
});

// Service types
type CreateConversationInput = z.infer<typeof createConversationSchema>;
type GetMessagesInput = z.infer<typeof getMessagesSchema>;
type SendMessageInput = z.infer<typeof sendMessageSchema>;
type MarkAsReadInput = z.infer<typeof markAsReadSchema>;

export function createMessageService({
	db,
	currentUser,
}: {
	db: PrismaClient;
	currentUser?: Session["user"];
}) {
	async function verifyConversationAccess(
		conversationId: string,
		userId: string,
	) {
		const conversation = await db.conversation.findFirst({
			where: {
				id: conversationId,
				OR: [{ participantOneId: userId }, { participantTwoId: userId }],
			},
		});

		if (!conversation) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Conversation not found or access denied",
			});
		}

		return conversation;
	}

	return {
		async createConversation(input: CreateConversationInput) {
			if (!currentUser) {
				throw new TRPCError({
					code: "UNAUTHORIZED",
					message: "User not authenticated",
				});
			}

			const userId = currentUser.id;

			// Check if conversation already exists between these users
			const existingConversation = await db.conversation.findFirst({
				where: {
					OR: [
						{
							participantOneId: userId,
							participantTwoId: input.participantTwoId,
						},
						{
							participantOneId: input.participantTwoId,
							participantTwoId: userId,
						},
					],
				},
			});

			if (existingConversation) {
				return existingConversation;
			}

			// Create new conversation
			return await db.conversation.create({
				data: {
					participantOneId: userId,
					participantTwoId: input.participantTwoId,
					bookingId: input.bookingId,
				},
				include: {
					participantOne: {
						select: {
							id: true,
							name: true,
							image: true,
						},
					},
					participantTwo: {
						select: {
							id: true,
							name: true,
							image: true,
						},
					},
				},
			});
		},

		async getConversations() {
			if (!currentUser) {
				throw new TRPCError({
					code: "UNAUTHORIZED",
					message: "User not authenticated",
				});
			}

			const userId = currentUser.id;

			return await db.conversation.findMany({
				where: {
					OR: [{ participantOneId: userId }, { participantTwoId: userId }],
				},
				include: {
					participantOne: {
						select: {
							id: true,
							name: true,
							image: true,
						},
					},
					participantTwo: {
						select: {
							id: true,
							name: true,
							image: true,
						},
					},
					messages: {
						orderBy: { createdAt: "desc" },
						take: 1,
						select: {
							id: true,
							content: true,
							messageType: true,
							isRead: true,
							createdAt: true,
							senderId: true,
						},
					},
					_count: {
						select: {
							messages: {
								where: {
									isRead: false,
									senderId: { not: userId },
								},
							},
						},
					},
				},
				orderBy: { lastMessageAt: "desc" },
			});
		},

		async getMessages(input: GetMessagesInput) {
			if (!currentUser) {
				throw new TRPCError({
					code: "UNAUTHORIZED",
					message: "User not authenticated",
				});
			}

			// Verify user is participant in this conversation
			await verifyConversationAccess(input.conversationId, currentUser.id);

			const messages = await db.message.findMany({
				where: {
					conversationId: input.conversationId,
					...(input.cursor && {
						id: { lt: input.cursor },
					}),
				},
				include: {
					sender: {
						select: {
							id: true,
							name: true,
							image: true,
						},
					},
				},
				orderBy: { createdAt: "desc" },
				take: input.limit + 1,
			});

			let nextCursor: typeof input.cursor | undefined = undefined;
			if (messages.length > input.limit) {
				const nextItem = messages.pop();
				nextCursor = nextItem?.id;
			}

			return {
				messages: messages.reverse(),
				nextCursor,
			};
		},

		async sendMessage(input: SendMessageInput) {
			if (!currentUser) {
				throw new TRPCError({
					code: "UNAUTHORIZED",
					message: "User not authenticated",
				});
			}

			const userId = currentUser.id;

			// Verify user is participant in this conversation
			await verifyConversationAccess(input.conversationId, userId);

			// Create the message and update conversation lastMessageAt in a transaction
			const result = await db.$transaction(async (tx) => {
				const message = await tx.message.create({
					data: {
						conversationId: input.conversationId,
						senderId: userId,
						content: input.content,
						messageType: input.messageType,
					},
					include: {
						sender: {
							select: {
								id: true,
								name: true,
								image: true,
							},
						},
					},
				});

				await tx.conversation.update({
					where: { id: input.conversationId },
					data: { lastMessageAt: new Date() },
				});

				return message;
			});

			return result;
		},

		async markAsRead(input: MarkAsReadInput) {
			if (!currentUser) {
				throw new TRPCError({
					code: "UNAUTHORIZED",
					message: "User not authenticated",
				});
			}

			const userId = currentUser.id;

			// Verify user is participant in this conversation
			await verifyConversationAccess(input.conversationId, userId);

			// Mark messages as read (only messages not sent by the current user)
			await db.message.updateMany({
				where: {
					conversationId: input.conversationId,
					senderId: { not: userId },
					isRead: false,
					...(input.messageIds && {
						id: { in: input.messageIds },
					}),
				},
				data: {
					isRead: true,
				},
			});

			return { success: true };
		},

		async getUnreadCount() {
			if (!currentUser) {
				throw new TRPCError({
					code: "UNAUTHORIZED",
					message: "User not authenticated",
				});
			}

			const userId = currentUser.id;

			const count = await db.message.count({
				where: {
					isRead: false,
					senderId: { not: userId },
					conversation: {
						OR: [{ participantOneId: userId }, { participantTwoId: userId }],
					},
				},
			});

			return { count };
		},
	};
}
