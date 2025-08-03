import type { PrismaClient } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import type { Session } from "next-auth";
import { z } from "zod";

// Input schemas
export const createReviewSchema = z.object({
	serviceId: z.string().cuid(),
	bookingId: z.string().cuid().optional(),
	rating: z.number().min(1).max(5),
	comment: z.string().min(10).max(1000).optional(),
});

export const updateReviewSchema = z.object({
	reviewId: z.string().cuid(),
	rating: z.number().min(1).max(5).optional(),
	comment: z.string().min(10).max(1000).optional(),
});

export const deleteReviewSchema = z.object({
	reviewId: z.string().cuid(),
});

export const getByServiceSchema = z.object({
	serviceId: z.string().cuid(),
	limit: z.number().min(1).max(50).default(10),
	cursor: z.string().optional(),
	rating: z.number().min(1).max(5).optional(),
});

export const getByProviderSchema = z.object({
	providerId: z.string().cuid(),
	limit: z.number().min(1).max(50).default(10),
	cursor: z.string().optional(),
});

export const getMyReviewsSchema = z.object({
	limit: z.number().min(1).max(50).default(10),
	cursor: z.string().optional(),
});

export const getServiceStatsSchema = z.object({
	serviceId: z.string().cuid(),
});

export const getProviderStatsSchema = z.object({
	providerId: z.string().cuid(),
});

export const canReviewSchema = z.object({
	serviceId: z.string().cuid(),
});

// Service types
type CreateReviewInput = z.infer<typeof createReviewSchema>;
type UpdateReviewInput = z.infer<typeof updateReviewSchema>;
type DeleteReviewInput = z.infer<typeof deleteReviewSchema>;
type GetByServiceInput = z.infer<typeof getByServiceSchema>;
type GetByProviderInput = z.infer<typeof getByProviderSchema>;
type GetMyReviewsInput = z.infer<typeof getMyReviewsSchema>;
type GetServiceStatsInput = z.infer<typeof getServiceStatsSchema>;
type GetProviderStatsInput = z.infer<typeof getProviderStatsSchema>;
type CanReviewInput = z.infer<typeof canReviewSchema>;

export function createReviewService({
	db,
	currentUser,
}: {
	db: PrismaClient;
	currentUser?: Session["user"];
}) {
	async function updateServiceAverageRating(serviceId: string) {
		const avgRatingResult = await db.review.aggregate({
			where: { serviceId },
			_avg: { rating: true },
		});

		await db.service.update({
			where: { id: serviceId },
			data: { avgRating: avgRatingResult._avg.rating },
		});
	}

	return {
		async createReview(input: CreateReviewInput) {
			if (!currentUser) {
				throw new TRPCError({
					code: "UNAUTHORIZED",
					message: "User not authenticated",
				});
			}

			// Verify service exists
			const service = await db.service.findUnique({
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
			const completedBooking = await db.booking.findFirst({
				where: {
					serviceId: input.serviceId,
					clientId: currentUser.id,
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
			const existingReview = await db.review.findUnique({
				where: {
					serviceId_clientId: {
						serviceId: input.serviceId,
						clientId: currentUser.id,
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
			const review = await db.review.create({
				data: {
					serviceId: input.serviceId,
					clientId: currentUser.id,
					providerId: service.providerId,
					rating: input.rating,
					comment: input.comment,
				},
			});

			// Update service average rating
			await updateServiceAverageRating(input.serviceId);

			// Create notification for provider
			await db.notification.create({
				data: {
					userId: service.providerId,
					type: "new_review",
					title: "New Review Received",
					message: `You received a ${input.rating}-star review for ${service.title}`,
				},
			});

			return review;
		},

		async updateReview(input: UpdateReviewInput) {
			if (!currentUser) {
				throw new TRPCError({
					code: "UNAUTHORIZED",
					message: "User not authenticated",
				});
			}

			// Verify review exists and belongs to user
			const review = await db.review.findUnique({
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

			if (review.clientId !== currentUser.id) {
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
			const updatedReview = await db.review.update({
				where: { id: input.reviewId },
				data: {
					rating: input.rating,
					comment: input.comment,
				},
			});

			// Recalculate service average rating
			await updateServiceAverageRating(review.serviceId);

			return updatedReview;
		},

		async deleteReview(input: DeleteReviewInput) {
			if (!currentUser) {
				throw new TRPCError({
					code: "UNAUTHORIZED",
					message: "User not authenticated",
				});
			}

			// Verify review exists and belongs to user
			const review = await db.review.findUnique({
				where: { id: input.reviewId },
			});

			if (!review) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Review not found",
				});
			}

			if (review.clientId !== currentUser.id) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "You can only delete your own reviews",
				});
			}

			// Delete review
			await db.review.delete({
				where: { id: input.reviewId },
			});

			// Recalculate service average rating
			const avgRatingResult = await db.review.aggregate({
				where: { serviceId: review.serviceId },
				_avg: { rating: true },
			});

			await db.service.update({
				where: { id: review.serviceId },
				data: { avgRating: avgRatingResult._avg.rating || null },
			});

			return { success: true };
		},

		async getByService(input: GetByServiceInput) {
			const where: Record<string, unknown> = {
				serviceId: input.serviceId,
			};

			if (input.rating) {
				where.rating = input.rating;
			}

			const reviews = await db.review.findMany({
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
		},

		async getByProvider(input: GetByProviderInput) {
			const reviews = await db.review.findMany({
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
		},

		async getMyReviews(input: GetMyReviewsInput) {
			if (!currentUser) {
				throw new TRPCError({
					code: "UNAUTHORIZED",
					message: "User not authenticated",
				});
			}

			const reviews = await db.review.findMany({
				where: {
					clientId: currentUser.id,
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
		},

		async getServiceStats(input: GetServiceStatsInput) {
			const [avgRating, ratingDistribution, totalReviews] = await Promise.all([
				db.review.aggregate({
					where: { serviceId: input.serviceId },
					_avg: { rating: true },
				}),
				db.review.groupBy({
					by: ["rating"],
					where: { serviceId: input.serviceId },
					_count: { rating: true },
				}),
				db.review.count({
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
		},

		async getProviderStats(input: GetProviderStatsInput) {
			const [avgRating, ratingDistribution, totalReviews] = await Promise.all([
				db.review.aggregate({
					where: { providerId: input.providerId },
					_avg: { rating: true },
				}),
				db.review.groupBy({
					by: ["rating"],
					where: { providerId: input.providerId },
					_count: { rating: true },
				}),
				db.review.count({
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
		},

		async canReview(input: CanReviewInput) {
			if (!currentUser) {
				throw new TRPCError({
					code: "UNAUTHORIZED",
					message: "User not authenticated",
				});
			}

			// Check if user has completed booking for this service
			const completedBooking = await db.booking.findFirst({
				where: {
					serviceId: input.serviceId,
					clientId: currentUser.id,
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
			const existingReview = await db.review.findUnique({
				where: {
					serviceId_clientId: {
						serviceId: input.serviceId,
						clientId: currentUser.id,
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
		},
	};
}
