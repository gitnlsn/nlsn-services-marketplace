import type { PrismaClient } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import type { Session } from "next-auth";
import { z } from "zod";

// Input schemas
export const listCategoriesSchema = z.object({
	includeServiceCount: z.boolean().default(false),
});

export const getCategoryByIdSchema = z.object({
	categoryId: z.string().cuid(),
});

export const getCategoryServicesSchema = z.object({
	categoryId: z.string().cuid(),
	limit: z.number().min(1).max(50).default(20),
	offset: z.number().min(0).default(0),
	sortBy: z
		.enum(["newest", "popular", "rating", "price_low", "price_high"])
		.default("newest"),
});

export const createCategorySchema = z.object({
	name: z.string().min(2).max(50),
});

export const updateCategorySchema = z.object({
	categoryId: z.string().cuid(),
	name: z.string().min(2).max(50),
});

export const deleteCategorySchema = z.object({
	categoryId: z.string().cuid(),
});

export const getCategoryStatsSchema = z.object({
	categoryId: z.string().cuid(),
});

// Service types
type ListCategoriesInput = z.infer<typeof listCategoriesSchema>;
type GetCategoryByIdInput = z.infer<typeof getCategoryByIdSchema>;
type GetCategoryServicesInput = z.infer<typeof getCategoryServicesSchema>;
type CreateCategoryInput = z.infer<typeof createCategorySchema>;
type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
type DeleteCategoryInput = z.infer<typeof deleteCategorySchema>;
type GetCategoryStatsInput = z.infer<typeof getCategoryStatsSchema>;

export function createCategoryService({
	db,
	currentUser,
}: {
	db: PrismaClient;
	currentUser?: Session["user"];
}) {
	// TODO: Add proper admin check when admin roles are implemented
	function checkAdminAccess(userId?: string) {
		if (!userId) {
			throw new TRPCError({
				code: "UNAUTHORIZED",
				message: "User not authenticated",
			});
		}
		// For now, allow any authenticated user to perform admin actions
		// In production, this should check user roles
	}

	return {
		async list(input: ListCategoriesInput) {
			const categories = await db.category.findMany({
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
		},

		async getById(input: GetCategoryByIdInput) {
			const category = await db.category.findUnique({
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
		},

		async getServices(input: GetCategoryServicesInput) {
			// Verify category exists
			const category = await db.category.findUnique({
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

			const [services, totalCount] = await db.$transaction([
				db.service.findMany({
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
				db.service.count({
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
		},

		async create(input: CreateCategoryInput) {
			checkAdminAccess(currentUser?.id);

			// Check if category already exists
			const existingCategory = await db.category.findFirst({
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

			const category = await db.category.create({
				data: {
					name: input.name.trim(),
				},
			});

			return category;
		},

		async update(input: UpdateCategoryInput) {
			checkAdminAccess(currentUser?.id);

			// Check if category exists
			const category = await db.category.findUnique({
				where: { id: input.categoryId },
			});

			if (!category) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Category not found",
				});
			}

			// Check if another category with this name exists
			const existingCategory = await db.category.findFirst({
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

			const updatedCategory = await db.category.update({
				where: { id: input.categoryId },
				data: {
					name: input.name.trim(),
				},
			});

			return updatedCategory;
		},

		async delete(input: DeleteCategoryInput) {
			checkAdminAccess(currentUser?.id);

			// Check if category exists
			const category = await db.category.findUnique({
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

			await db.category.delete({
				where: { id: input.categoryId },
			});

			return { success: true };
		},

		async getStats(input: GetCategoryStatsInput) {
			checkAdminAccess(currentUser?.id);

			const category = await db.category.findUnique({
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
				db.service.count({
					where: { categoryId: input.categoryId },
				}),
				db.service.count({
					where: {
						categoryId: input.categoryId,
						status: "active",
					},
				}),
				db.booking.count({
					where: {
						service: {
							categoryId: input.categoryId,
						},
					},
				}),
				db.payment.aggregate({
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
				db.review.aggregate({
					where: {
						service: {
							categoryId: input.categoryId,
						},
					},
					_avg: { rating: true },
				}),
			]);

			// Get top services in category
			const topServices = await db.service.findMany({
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
		},
	};
}
