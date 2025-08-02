import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
	createTRPCRouter,
	protectedProcedure,
	publicProcedure,
} from "~/server/api/trpc";
import {
	addBankAccountSchema,
	createUserService,
	requestWithdrawalSchema,
	updateProfileSchema,
} from "~/server/services/user-service";

export const userRouter = createTRPCRouter({
	// Get current authenticated user
	getCurrentUser: protectedProcedure.query(async ({ ctx }) => {
		const userService = createUserService({
			db: ctx.db,
			currentUser: ctx.session.user,
		});
		return await userService.getCurrentUser();
	}),

	// Update user profile
	updateProfile: protectedProcedure
		.input(updateProfileSchema)
		.mutation(async ({ ctx, input }) => {
			const userService = createUserService({
				db: ctx.db,
				currentUser: ctx.session.user,
			});
			return await userService.updateProfile(input);
		}),

	// Get user by ID (public)
	getById: publicProcedure
		.input(
			z.object({
				id: z.string(),
			}),
		)
		.query(async ({ ctx, input }) => {
			// For public endpoints, we create a service without currentUser
			const userService = createUserService({
				db: ctx.db,
			});
			return await userService.getUserById(input.id);
		}),

	// Switch to professional role
	becomeProfessional: protectedProcedure.mutation(async ({ ctx }) => {
		const userService = createUserService({
			db: ctx.db,
			currentUser: ctx.session.user,
		});
		return await userService.becomeProfessional();
	}),

	// Update notification preferences
	updateNotificationPreferences: protectedProcedure
		.input(
			z.object({
				notificationEmail: z.boolean().optional(),
				notificationSms: z.boolean().optional(),
				notificationWhatsapp: z.boolean().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const user = await ctx.db.user.update({
				where: {
					id: ctx.session.user.id,
				},
				data: input,
			});

			return user;
		}),

	// Add bank account for withdrawals
	addBankAccount: protectedProcedure
		.input(addBankAccountSchema)
		.mutation(async ({ ctx, input }) => {
			const userService = createUserService({
				db: ctx.db,
				currentUser: ctx.session.user,
			});
			return await userService.addBankAccount(input);
		}),

	// Get user's bank accounts
	getBankAccounts: protectedProcedure.query(async ({ ctx }) => {
		const userService = createUserService({
			db: ctx.db,
			currentUser: ctx.session.user,
		});
		return await userService.getBankAccounts();
	}),

	// Request withdrawal
	requestWithdrawal: protectedProcedure
		.input(requestWithdrawalSchema)
		.mutation(async ({ ctx, input }) => {
			const userService = createUserService({
				db: ctx.db,
				currentUser: ctx.session.user,
			});
			return await userService.requestWithdrawal(input);
		}),

	// Get user earnings summary
	getEarningsSummary: protectedProcedure.query(async ({ ctx }) => {
		const userService = createUserService({
			db: ctx.db,
			currentUser: ctx.session.user,
		});
		return await userService.getEarningsSummary();
	}),
});
