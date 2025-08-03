import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import {
	addBankAccountSchema,
	createDashboardService,
	deleteBankAccountSchema,
	getEarningsChartSchema,
	getEarningsSchema,
	getWithdrawalsSchema,
	requestWithdrawalSchema,
} from "~/server/services/dashboard-service";

export const dashboardRouter = createTRPCRouter({
	// Get professional dashboard overview
	getOverview: protectedProcedure.query(async ({ ctx }) => {
		const dashboardService = createDashboardService({
			db: ctx.db,
			currentUser: ctx.session.user,
		});
		return await dashboardService.getOverview();
	}),

	// Get monthly earnings chart data
	getEarningsChart: protectedProcedure
		.input(getEarningsChartSchema)
		.query(async ({ ctx, input }) => {
			const dashboardService = createDashboardService({
				db: ctx.db,
				currentUser: ctx.session.user,
			});
			return await dashboardService.getEarningsChart(input);
		}),

	// Get earnings data
	getEarnings: protectedProcedure
		.input(getEarningsSchema)
		.query(async ({ ctx, input }) => {
			const dashboardService = createDashboardService({
				db: ctx.db,
				currentUser: ctx.session.user,
			});
			return await dashboardService.getEarnings(input);
		}),

	// Request withdrawal
	requestWithdrawal: protectedProcedure
		.input(requestWithdrawalSchema)
		.mutation(async ({ ctx, input }) => {
			const dashboardService = createDashboardService({
				db: ctx.db,
				currentUser: ctx.session.user,
			});
			return await dashboardService.requestWithdrawal(input);
		}),

	// Get withdrawal history
	getWithdrawals: protectedProcedure
		.input(getWithdrawalsSchema)
		.query(async ({ ctx, input }) => {
			const dashboardService = createDashboardService({
				db: ctx.db,
				currentUser: ctx.session.user,
			});
			return await dashboardService.getWithdrawals(input);
		}),

	// Get bank accounts
	getBankAccounts: protectedProcedure.query(async ({ ctx }) => {
		const dashboardService = createDashboardService({
			db: ctx.db,
			currentUser: ctx.session.user,
		});
		return await dashboardService.getBankAccounts();
	}),

	// Add bank account
	addBankAccount: protectedProcedure
		.input(addBankAccountSchema)
		.mutation(async ({ ctx, input }) => {
			const dashboardService = createDashboardService({
				db: ctx.db,
				currentUser: ctx.session.user,
			});
			return await dashboardService.addBankAccount(input);
		}),

	// Delete bank account
	deleteBankAccount: protectedProcedure
		.input(deleteBankAccountSchema)
		.mutation(async ({ ctx, input }) => {
			const dashboardService = createDashboardService({
				db: ctx.db,
				currentUser: ctx.session.user,
			});
			return await dashboardService.deleteBankAccount(input);
		}),
});
