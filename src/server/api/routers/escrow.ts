import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import {
	createEscrowService,
	disputePaymentSchema,
	getEarningsHistorySchema,
	getEarningsOverviewSchema,
	getEscrowStatsSchema,
	getPendingReleasesSchema,
	getWithdrawalHistorySchema,
	processEscrowReleasesSchema,
	requestEarlyReleaseSchema,
	requestWithdrawalSchema,
} from "~/server/services/escrow-service";

export const escrowRouter = createTRPCRouter({
	// Get provider's earnings overview
	getEarningsOverview: protectedProcedure
		.input(getEarningsOverviewSchema)
		.query(async ({ ctx, input }) => {
			const escrowService = createEscrowService({
				db: ctx.db,
				currentUser: ctx.session.user,
			});
			return await escrowService.getEarningsOverview(input);
		}),

	// Get detailed earnings breakdown
	getEarningsHistory: protectedProcedure
		.input(getEarningsHistorySchema)
		.query(async ({ ctx, input }) => {
			const escrowService = createEscrowService({
				db: ctx.db,
				currentUser: ctx.session.user,
			});
			return await escrowService.getEarningsHistory(input);
		}),

	// Request early escrow release (for disputes or special cases)
	requestEarlyRelease: protectedProcedure
		.input(requestEarlyReleaseSchema)
		.mutation(async ({ ctx, input }) => {
			const escrowService = createEscrowService({
				db: ctx.db,
				currentUser: ctx.session.user,
			});
			return await escrowService.requestEarlyRelease(input);
		}),

	// Dispute a payment (for clients)
	disputePayment: protectedProcedure
		.input(disputePaymentSchema)
		.mutation(async ({ ctx, input }) => {
			const escrowService = createEscrowService({
				db: ctx.db,
				currentUser: ctx.session.user,
			});
			return await escrowService.disputePayment(input);
		}),

	// Get withdrawal history
	getWithdrawalHistory: protectedProcedure
		.input(getWithdrawalHistorySchema)
		.query(async ({ ctx, input }) => {
			const escrowService = createEscrowService({
				db: ctx.db,
				currentUser: ctx.session.user,
			});
			return await escrowService.getWithdrawalHistory(input);
		}),

	// Request withdrawal
	requestWithdrawal: protectedProcedure
		.input(requestWithdrawalSchema)
		.mutation(async ({ ctx, input }) => {
			const escrowService = createEscrowService({
				db: ctx.db,
				currentUser: ctx.session.user,
			});
			return await escrowService.requestWithdrawal(input);
		}),

	// Get pending escrow releases (admin only - for cron jobs)
	getPendingReleases: protectedProcedure
		.input(getPendingReleasesSchema)
		.query(async ({ ctx, input }) => {
			const escrowService = createEscrowService({
				db: ctx.db,
				currentUser: ctx.session.user,
			});
			return await escrowService.getPendingReleases(input);
		}),

	// Process escrow releases (admin only - typically called by cron)
	processEscrowReleases: protectedProcedure
		.input(processEscrowReleasesSchema)
		.mutation(async ({ ctx, input }) => {
			const escrowService = createEscrowService({
				db: ctx.db,
				currentUser: ctx.session.user,
			});
			return await escrowService.processEscrowReleases(input);
		}),

	// Get escrow statistics (for dashboard)
	getEscrowStats: protectedProcedure
		.input(getEscrowStatsSchema)
		.query(async ({ ctx, input }) => {
			const escrowService = createEscrowService({
				db: ctx.db,
				currentUser: ctx.session.user,
			});
			return await escrowService.getEscrowStats(input);
		}),
});
