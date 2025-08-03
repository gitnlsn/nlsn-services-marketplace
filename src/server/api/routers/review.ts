import {
	createTRPCRouter,
	protectedProcedure,
	publicProcedure,
} from "~/server/api/trpc";
import {
	canReviewSchema,
	createReviewSchema,
	createReviewService,
	deleteReviewSchema,
	getByProviderSchema,
	getByServiceSchema,
	getMyReviewsSchema,
	getProviderStatsSchema,
	getServiceStatsSchema,
	updateReviewSchema,
} from "~/server/services/review-service";

export const reviewRouter = createTRPCRouter({
	// Create review (client only, after completed booking)
	create: protectedProcedure
		.input(createReviewSchema)
		.mutation(async ({ ctx, input }) => {
			const reviewService = createReviewService({
				db: ctx.db,
				currentUser: ctx.session.user,
			});
			return await reviewService.createReview(input);
		}),

	// Update review (client only)
	update: protectedProcedure
		.input(updateReviewSchema)
		.mutation(async ({ ctx, input }) => {
			const reviewService = createReviewService({
				db: ctx.db,
				currentUser: ctx.session.user,
			});
			return await reviewService.updateReview(input);
		}),

	// Delete review (client only)
	delete: protectedProcedure
		.input(deleteReviewSchema)
		.mutation(async ({ ctx, input }) => {
			const reviewService = createReviewService({
				db: ctx.db,
				currentUser: ctx.session.user,
			});
			return await reviewService.deleteReview(input);
		}),

	// Get reviews for a service (public)
	getByService: publicProcedure
		.input(getByServiceSchema)
		.query(async ({ ctx, input }) => {
			const reviewService = createReviewService({
				db: ctx.db,
			});
			return await reviewService.getByService(input);
		}),

	// Get reviews by provider (public)
	getByProvider: publicProcedure
		.input(getByProviderSchema)
		.query(async ({ ctx, input }) => {
			const reviewService = createReviewService({
				db: ctx.db,
			});
			return await reviewService.getByProvider(input);
		}),

	// Get user's reviews
	getMyReviews: protectedProcedure
		.input(getMyReviewsSchema)
		.query(async ({ ctx, input }) => {
			const reviewService = createReviewService({
				db: ctx.db,
				currentUser: ctx.session.user,
			});
			return await reviewService.getMyReviews(input);
		}),

	// Get review statistics for a service
	getServiceStats: publicProcedure
		.input(getServiceStatsSchema)
		.query(async ({ ctx, input }) => {
			const reviewService = createReviewService({
				db: ctx.db,
			});
			return await reviewService.getServiceStats(input);
		}),

	// Get review statistics for a provider
	getProviderStats: publicProcedure
		.input(getProviderStatsSchema)
		.query(async ({ ctx, input }) => {
			const reviewService = createReviewService({
				db: ctx.db,
			});
			return await reviewService.getProviderStats(input);
		}),

	// Check if user can review a service
	canReview: protectedProcedure
		.input(canReviewSchema)
		.query(async ({ ctx, input }) => {
			const reviewService = createReviewService({
				db: ctx.db,
				currentUser: ctx.session.user,
			});
			return await reviewService.canReview(input);
		}),
});
