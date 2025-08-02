import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
	createTRPCRouter,
	protectedProcedure,
	publicProcedure,
} from "~/server/api/trpc";

export const reviewRouter = createTRPCRouter({
	// Create review (client only, after completed booking)
	create: protectedProcedure
		.input(
			z.object({
				serviceId: z.string().cuid(),
				bookingId: z.string().cuid().optional(), // Optional for backward compatibility
				rating: z.number().min(1).max(5),
				comment: z.string().min(10).max(1000).optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// Verify service exists
			const service = await ctx.db.service.findUnique({
				where: { id: input.serviceId },
				include: {
					provider: true,
				},
			});

			if (!service) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Service not found",
				});
			}

			// Check if user has completed booking for this service
			const completedBooking = await ctx.db.booking.findFirst({
				where: {
					serviceId: input.serviceId,
					clientId: ctx.session.user.id,
					status: "completed",
					...(input.bookingId ? { id: input.bookingId } : {}),
				},
			});

			if (!completedBooking) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message:
						"You can only review services you have completed bookings for",
				});
			}

			// Check if review already exists
			const existingReview = await ctx.db.review.findUnique({
				where: {
					serviceId_clientId: {
						serviceId: input.serviceId,
						clientId: ctx.session.user.id,
					},
				},
			});

			if (existingReview) {
				throw new TRPCError({
					code: "CONFLICT",
					message: "You have already reviewed this service",
				});
			}

			// Create review
			const review = await ctx.db.review.create({
				data: {
					serviceId: input.serviceId,
					clientId: ctx.session.user.id,
					providerId: service.providerId,
					rating: input.rating,
					comment: input.comment,
				},
			});

			// Update service average rating
			const avgRatingResult = await ctx.db.review.aggregate({
				where: { serviceId: input.serviceId },
				_avg: { rating: true },
			});

			await ctx.db.service.update({
				where: { id: input.serviceId },
				data: { avgRating: avgRatingResult._avg.rating },
			});

			// Create notification for provider
			await ctx.db.notification.create({
				data: {
					userId: service.providerId,
					type: "new_review",
					title: "New Review Received",
					message: `You received a ${input.rating}-star review for ${service.title}`,
				},
			});

			return review;
		}),

	// Update review (client only)
	update: protectedProcedure
		.input(
			z.object({
				reviewId: z.string().cuid(),
				rating: z.number().min(1).max(5).optional(),
				comment: z.string().min(10).max(1000).optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// Verify review exists and belongs to user
			const review = await ctx.db.review.findUnique({
				where: { id: input.reviewId },
				include: {
					service: true,
				},
			});

			if (!review) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Review not found",
				});
			}

			if (review.clientId !== ctx.session.user.id) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "You can only update your own reviews",
				});
			}

			// Check if review is not too old (e.g., 30 days)
			const thirtyDaysAgo = new Date();
			thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

			if (review.createdAt < thirtyDaysAgo) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Reviews can only be updated within 30 days of creation",
				});
			}

			// Update review
			const updatedReview = await ctx.db.review.update({
				where: { id: input.reviewId },
				data: {
					rating: input.rating,
					comment: input.comment,
				},
			});

			// Recalculate service average rating
			const avgRatingResult = await ctx.db.review.aggregate({
				where: { serviceId: review.serviceId },
				_avg: { rating: true },
			});

			await ctx.db.service.update({
				where: { id: review.serviceId },
				data: { avgRating: avgRatingResult._avg.rating },
			});

			return updatedReview;
		}),

	// Delete review (client only)
	delete: protectedProcedure
		.input(
			z.object({
				reviewId: z.string().cuid(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// Verify review exists and belongs to user
			const review = await ctx.db.review.findUnique({
				where: { id: input.reviewId },
			});

			if (!review) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Review not found",
				});
			}

			if (review.clientId !== ctx.session.user.id) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "You can only delete your own reviews",
				});
			}

			// Delete review
			await ctx.db.review.delete({
				where: { id: input.reviewId },
			});

			// Recalculate service average rating
			const avgRatingResult = await ctx.db.review.aggregate({
				where: { serviceId: review.serviceId },
				_avg: { rating: true },
			});

			await ctx.db.service.update({
				where: { id: review.serviceId },
				data: { avgRating: avgRatingResult._avg.rating || null },
			});

			return { success: true };
		}),

	// Get reviews for a service (public)
	getByService: publicProcedure
		.input(
			z.object({
				serviceId: z.string().cuid(),
				limit: z.number().min(1).max(50).default(10),
				cursor: z.string().optional(),
				rating: z.number().min(1).max(5).optional(), // Filter by rating
			}),
		)
		.query(async ({ ctx, input }) => {
			const where: Record<string, unknown> = {
				serviceId: input.serviceId,
			};

			if (input.rating) {
				where.rating = input.rating;
			}

			const reviews = await ctx.db.review.findMany({
				where,
				take: input.limit + 1,
				cursor: input.cursor ? { id: input.cursor } : undefined,
				orderBy: { createdAt: "desc" },
				include: {
					client: {
						select: {
							id: true,
							name: true,
							image: true,
						},
					},
				},
			});

			let nextCursor: typeof input.cursor | undefined = undefined;
			if (reviews.length > input.limit) {
				const nextItem = reviews.pop();
				nextCursor = nextItem?.id;
			}

			return {
				reviews,
				nextCursor,
			};
		}),

	// Get reviews by provider (public)
	getByProvider: publicProcedure
		.input(
			z.object({
				providerId: z.string().cuid(),
				limit: z.number().min(1).max(50).default(10),
				cursor: z.string().optional(),
			}),
		)
		.query(async ({ ctx, input }) => {
			const reviews = await ctx.db.review.findMany({
				where: {
					providerId: input.providerId,
				},
				take: input.limit + 1,
				cursor: input.cursor ? { id: input.cursor } : undefined,
				orderBy: { createdAt: "desc" },
				include: {
					client: {
						select: {
							id: true,
							name: true,
							image: true,
						},
					},
					service: {
						select: {
							id: true,
							title: true,
						},
					},
				},
			});

			let nextCursor: typeof input.cursor | undefined = undefined;
			if (reviews.length > input.limit) {
				const nextItem = reviews.pop();
				nextCursor = nextItem?.id;
			}

			return {
				reviews,
				nextCursor,
			};
		}),

	// Get user's reviews
	getMyReviews: protectedProcedure
		.input(
			z.object({
				limit: z.number().min(1).max(50).default(10),
				cursor: z.string().optional(),
			}),
		)
		.query(async ({ ctx, input }) => {
			const reviews = await ctx.db.review.findMany({
				where: {
					clientId: ctx.session.user.id,
				},
				take: input.limit + 1,
				cursor: input.cursor ? { id: input.cursor } : undefined,
				orderBy: { createdAt: "desc" },
				include: {
					service: {
						select: {
							id: true,
							title: true,
							images: { take: 1 },
						},
					},
					provider: {
						select: {
							id: true,
							name: true,
							image: true,
						},
					},
				},
			});

			let nextCursor: typeof input.cursor | undefined = undefined;
			if (reviews.length > input.limit) {
				const nextItem = reviews.pop();
				nextCursor = nextItem?.id;
			}

			return {
				reviews,
				nextCursor,
			};
		}),

	// Get review statistics for a service
	getServiceStats: publicProcedure
		.input(
			z.object({
				serviceId: z.string().cuid(),
			}),
		)
		.query(async ({ ctx, input }) => {
			const [avgRating, ratingDistribution, totalReviews] = await Promise.all([
				ctx.db.review.aggregate({
					where: { serviceId: input.serviceId },
					_avg: { rating: true },
				}),
				ctx.db.review.groupBy({
					by: ["rating"],
					where: { serviceId: input.serviceId },
					_count: { rating: true },
				}),
				ctx.db.review.count({
					where: { serviceId: input.serviceId },
				}),
			]);

			// Create rating distribution object
			const distribution = {
				1: 0,
				2: 0,
				3: 0,
				4: 0,
				5: 0,
			};

			for (const item of ratingDistribution) {
				distribution[item.rating as keyof typeof distribution] =
					item._count.rating;
			}

			return {
				avgRating: avgRating._avg.rating || 0,
				totalReviews,
				distribution,
			};
		}),

	// Get review statistics for a provider
	getProviderStats: publicProcedure
		.input(
			z.object({
				providerId: z.string().cuid(),
			}),
		)
		.query(async ({ ctx, input }) => {
			const [avgRating, ratingDistribution, totalReviews] = await Promise.all([
				ctx.db.review.aggregate({
					where: { providerId: input.providerId },
					_avg: { rating: true },
				}),
				ctx.db.review.groupBy({
					by: ["rating"],
					where: { providerId: input.providerId },
					_count: { rating: true },
				}),
				ctx.db.review.count({
					where: { providerId: input.providerId },
				}),
			]);

			// Create rating distribution object
			const distribution = {
				1: 0,
				2: 0,
				3: 0,
				4: 0,
				5: 0,
			};

			for (const item of ratingDistribution) {
				distribution[item.rating as keyof typeof distribution] =
					item._count.rating;
			}

			return {
				avgRating: avgRating._avg.rating || 0,
				totalReviews,
				distribution,
			};
		}),

	// Check if user can review a service
	canReview: protectedProcedure
		.input(
			z.object({
				serviceId: z.string().cuid(),
			}),
		)
		.query(async ({ ctx, input }) => {
			// Check if user has completed booking for this service
			const completedBooking = await ctx.db.booking.findFirst({
				where: {
					serviceId: input.serviceId,
					clientId: ctx.session.user.id,
					status: "completed",
				},
			});

			if (!completedBooking) {
				return {
					canReview: false,
					reason: "no_completed_booking",
				};
			}

			// Check if review already exists
			const existingReview = await ctx.db.review.findUnique({
				where: {
					serviceId_clientId: {
						serviceId: input.serviceId,
						clientId: ctx.session.user.id,
					},
				},
			});

			if (existingReview) {
				return {
					canReview: false,
					reason: "already_reviewed",
					existingReview: {
						id: existingReview.id,
						rating: existingReview.rating,
						comment: existingReview.comment,
						createdAt: existingReview.createdAt,
					},
				};
			}

			return {
				canReview: true,
				bookingId: completedBooking.id,
			};
		}),
});
