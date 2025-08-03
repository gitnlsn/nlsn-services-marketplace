import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import {
	createConversationSchema,
	createMessageService,
	getMessagesSchema,
	markAsReadSchema,
	sendMessageSchema,
} from "~/server/services/message-service";

export const messageRouter = createTRPCRouter({
	// Create a new conversation between two users
	createConversation: protectedProcedure
		.input(createConversationSchema)
		.mutation(async ({ ctx, input }) => {
			const messageService = createMessageService({
				db: ctx.db,
				currentUser: ctx.session.user,
			});
			return await messageService.createConversation(input);
		}),

	// Get all conversations for the current user
	getConversations: protectedProcedure.query(async ({ ctx }) => {
		const messageService = createMessageService({
			db: ctx.db,
			currentUser: ctx.session.user,
		});
		return await messageService.getConversations();
	}),

	// Get messages for a specific conversation
	getMessages: protectedProcedure
		.input(getMessagesSchema)
		.query(async ({ ctx, input }) => {
			const messageService = createMessageService({
				db: ctx.db,
				currentUser: ctx.session.user,
			});
			return await messageService.getMessages(input);
		}),

	// Send a new message
	sendMessage: protectedProcedure
		.input(sendMessageSchema)
		.mutation(async ({ ctx, input }) => {
			const messageService = createMessageService({
				db: ctx.db,
				currentUser: ctx.session.user,
			});
			return await messageService.sendMessage(input);
		}),

	// Mark messages as read
	markAsRead: protectedProcedure
		.input(markAsReadSchema)
		.mutation(async ({ ctx, input }) => {
			const messageService = createMessageService({
				db: ctx.db,
				currentUser: ctx.session.user,
			});
			return await messageService.markAsRead(input);
		}),

	// Get unread message count for all conversations
	getUnreadCount: protectedProcedure.query(async ({ ctx }) => {
		const messageService = createMessageService({
			db: ctx.db,
			currentUser: ctx.session.user,
		});
		return await messageService.getUnreadCount();
	}),
});
