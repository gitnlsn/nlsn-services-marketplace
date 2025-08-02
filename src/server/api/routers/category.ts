import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
	createTRPCRouter,
	protectedProcedure,
	publicProcedure,
} from "~/server/api/trpc";

export const categoryRouter = createTRPCRouter({
	// Get all categories (public)
	list: publicProcedure
		.input(
			z.object({
				includeServiceCount: z.boolean().default(false),
			}),
		)
		.query(async ({ ctx, input }) => {
			const categories = await ctx.db.category.findMany({
				orderBy: { name: "asc" },
				include: input.includeServiceCount
					? {
							_count: {
								select: {
									services: {
										where: {
											status: "active",
										},
									},
								},
							},
						}
					: undefined,
			});

			return categories.map((category) => ({
				id: category.id,
				name: category.name,
				serviceCount: input.includeServiceCount
					? (category as { _count?: { services: number } })._count?.services ||
						0
					: undefined,
			}));
		}),

	// Get category by ID (public)
	getById: publicProcedure
		.input(
			z.object({
				categoryId: z.string().cuid(),
			}),
		)
		.query(async ({ ctx, input }) => {
			const category = await ctx.db.category.findUnique({
				where: { id: input.categoryId },
				include: {
					_count: {
						select: {
							services: {
								where: {
									status: "active",
								},
							},
						},
					},
				},
			});

			if (!category) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Category not found",
				});
			}

			return {
				id: category.id,
				name: category.name,
				serviceCount: category._count.services,
			};
		}),

	// Get services by category (public)
	getServices: publicProcedure
		.input(
			z.object({
				categoryId: z.string().cuid(),
				limit: z.number().min(1).max(50).default(20),
				offset: z.number().min(0).default(0),
				sortBy: z
					.enum(["newest", "popular", "rating", "price_low", "price_high"])
					.default("newest"),
			}),
		)
		.query(async ({ ctx, input }) => {
			// Verify category exists
			const category = await ctx.db.category.findUnique({
				where: { id: input.categoryId },
			});

			if (!category) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Category not found",
				});
			}

			// Build order by clause
			let orderBy: { [key: string]: "asc" | "desc" } = { createdAt: "desc" }; // default: newest
			switch (input.sortBy) {
				case "popular":
					orderBy = { bookingCount: "desc" };
					break;
				case "rating":
					orderBy = { avgRating: "desc" };
					break;
				case "price_low":
					orderBy = { price: "asc" };
					break;
				case "price_high":
					orderBy = { price: "desc" };
					break;
			}

			const [services, totalCount] = await ctx.db.$transaction([
				ctx.db.service.findMany({
					where: {
						categoryId: input.categoryId,
						status: "active",
					},
					skip: input.offset,
					take: input.limit,
					orderBy,
					include: {
						provider: {
							select: {
								id: true,
								name: true,
								image: true,
								isProfessional: true,
							},
						},
						images: { take: 1 },
						_count: {
							select: {
								bookings: true,
								reviews: true,
							},
						},
					},
				}),
				ctx.db.service.count({
					where: {
						categoryId: input.categoryId,
						status: "active",
					},
				}),
			]);

			return {
				category,
				services,
				totalCount,
				hasMore: input.offset + services.length < totalCount,
			};
		}),

	// Create category (admin only)
	create: protectedProcedure
		.input(
			z.object({
				name: z.string().min(2).max(50),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// TODO: Add admin check when admin roles are implemented
			// For now, allow any authenticated user to create categories

			// Check if category already exists
			const existingCategory = await ctx.db.category.findFirst({
				where: {
					name: {
						equals: input.name,
						mode: "insensitive",
					},
				},
			});

			if (existingCategory) {
				throw new TRPCError({
					code: "CONFLICT",
					message: "Category with this name already exists",
				});
			}

			const category = await ctx.db.category.create({
				data: {
					name: input.name.trim(),
				},
			});

			return category;
		}),

	// Update category (admin only)
	update: protectedProcedure
		.input(
			z.object({
				categoryId: z.string().cuid(),
				name: z.string().min(2).max(50),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// TODO: Add admin check when admin roles are implemented

			// Check if category exists
			const category = await ctx.db.category.findUnique({
				where: { id: input.categoryId },
			});

			if (!category) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Category not found",
				});
			}

			// Check if another category with this name exists
			const existingCategory = await ctx.db.category.findFirst({
				where: {
					name: {
						equals: input.name,
						mode: "insensitive",
					},
					id: {
						not: input.categoryId,
					},
				},
			});

			if (existingCategory) {
				throw new TRPCError({
					code: "CONFLICT",
					message: "Category with this name already exists",
				});
			}

			const updatedCategory = await ctx.db.category.update({
				where: { id: input.categoryId },
				data: {
					name: input.name.trim(),
				},
			});

			return updatedCategory;
		}),

	// Delete category (admin only)
	delete: protectedProcedure
		.input(
			z.object({
				categoryId: z.string().cuid(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// TODO: Add admin check when admin roles are implemented

			// Check if category exists
			const category = await ctx.db.category.findUnique({
				where: { id: input.categoryId },
				include: {
					_count: {
						select: {
							services: true,
						},
					},
				},
			});

			if (!category) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Category not found",
				});
			}

			// Check if category has services
			if (category._count.services > 0) {
				throw new TRPCError({
					code: "CONFLICT",
					message:
						"Cannot delete category with existing services. Move or delete services first.",
				});
			}

			await ctx.db.category.delete({
				where: { id: input.categoryId },
			});

			return { success: true };
		}),

	// Get category statistics (admin only)
	getStats: protectedProcedure
		.input(
			z.object({
				categoryId: z.string().cuid(),
			}),
		)
		.query(async ({ ctx, input }) => {
			// TODO: Add admin check when admin roles are implemented

			const category = await ctx.db.category.findUnique({
				where: { id: input.categoryId },
			});

			if (!category) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Category not found",
				});
			}

			// Get category statistics
			const [
				totalServices,
				activeServices,
				totalBookings,
				totalEarnings,
				avgServiceRating,
			] = await Promise.all([
				ctx.db.service.count({
					where: { categoryId: input.categoryId },
				}),
				ctx.db.service.count({
					where: {
						categoryId: input.categoryId,
						status: "active",
					},
				}),
				ctx.db.booking.count({
					where: {
						service: {
							categoryId: input.categoryId,
						},
					},
				}),
				ctx.db.payment.aggregate({
					where: {
						booking: {
							service: {
								categoryId: input.categoryId,
							},
						},
						status: "paid",
					},
					_sum: { amount: true },
				}),
				ctx.db.review.aggregate({
					where: {
						service: {
							categoryId: input.categoryId,
						},
					},
					_avg: { rating: true },
				}),
			]);

			// Get top services in category
			const topServices = await ctx.db.service.findMany({
				where: {
					categoryId: input.categoryId,
					status: "active",
				},
				take: 5,
				orderBy: [{ avgRating: "desc" }, { bookingCount: "desc" }],
				include: {
					provider: {
						select: {
							name: true,
						},
					},
				},
			});

			return {
				category,
				stats: {
					totalServices,
					activeServices,
					totalBookings,
					totalEarnings: totalEarnings._sum.amount || 0,
					avgServiceRating: avgServiceRating._avg.rating || 0,
				},
				topServices,
			};
		}),
});
