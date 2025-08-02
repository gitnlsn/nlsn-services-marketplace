import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const messageRouter = createTRPCRouter({
	// Create a new conversation between two users
	createConversation: protectedProcedure
		.input(
			z.object({
				participantTwoId: z.string().cuid(),
				bookingId: z.string().cuid().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.session.user.id;

			// Check if conversation already exists between these users
			const existingConversation = await ctx.db.conversation.findFirst({
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
			return await ctx.db.conversation.create({
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
		}),

	// Get all conversations for the current user
	getConversations: protectedProcedure.query(async ({ ctx }) => {
		const userId = ctx.session.user.id;

		return await ctx.db.conversation.findMany({
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
	}),

	// Get messages for a specific conversation
	getMessages: protectedProcedure
		.input(
			z.object({
				conversationId: z.string().cuid(),
				limit: z.number().min(1).max(100).default(50),
				cursor: z.string().cuid().optional(),
			}),
		)
		.query(async ({ ctx, input }) => {
			const userId = ctx.session.user.id;

			// Verify user is participant in this conversation
			const conversation = await ctx.db.conversation.findFirst({
				where: {
					id: input.conversationId,
					OR: [{ participantOneId: userId }, { participantTwoId: userId }],
				},
			});

			if (!conversation) {
				throw new Error("Conversation not found or access denied");
			}

			const messages = await ctx.db.message.findMany({
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
		}),

	// Send a new message
	sendMessage: protectedProcedure
		.input(
			z.object({
				conversationId: z.string().cuid(),
				content: z.string().min(1).max(1000),
				messageType: z.enum(["text", "image", "file"]).default("text"),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.session.user.id;

			// Verify user is participant in this conversation
			const conversation = await ctx.db.conversation.findFirst({
				where: {
					id: input.conversationId,
					OR: [{ participantOneId: userId }, { participantTwoId: userId }],
				},
			});

			if (!conversation) {
				throw new Error("Conversation not found or access denied");
			}

			// Create the message and update conversation lastMessageAt in a transaction
			const result = await ctx.db.$transaction(async (tx) => {
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
		}),

	// Mark messages as read
	markAsRead: protectedProcedure
		.input(
			z.object({
				conversationId: z.string().cuid(),
				messageIds: z.array(z.string().cuid()).optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.session.user.id;

			// Verify user is participant in this conversation
			const conversation = await ctx.db.conversation.findFirst({
				where: {
					id: input.conversationId,
					OR: [{ participantOneId: userId }, { participantTwoId: userId }],
				},
			});

			if (!conversation) {
				throw new Error("Conversation not found or access denied");
			}

			// Mark messages as read (only messages not sent by the current user)
			await ctx.db.message.updateMany({
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
		}),

	// Get unread message count for all conversations
	getUnreadCount: protectedProcedure.query(async ({ ctx }) => {
		const userId = ctx.session.user.id;

		const count = await ctx.db.message.count({
			where: {
				isRead: false,
				senderId: { not: userId },
				conversation: {
					OR: [{ participantOneId: userId }, { participantTwoId: userId }],
				},
			},
		});

		return { count };
	}),
});
