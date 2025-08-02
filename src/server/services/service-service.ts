import type { PrismaClient, User } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

// Input schemas
export const createServiceSchema = z.object({
	title: z.string().min(5).max(100),
	description: z.string().min(20).max(1000),
	price: z.number().positive(),
	priceType: z.enum(["fixed", "hourly"]).default("fixed"),
	categoryId: z.string().cuid(),
	duration: z.number().min(15).optional(), // in minutes
	location: z.string().optional(),
	maxBookings: z.number().min(1).optional(),
	images: z.array(z.string().url()).max(5).optional(),
});

export const updateServiceSchema = z.object({
	serviceId: z.string().cuid(),
	title: z.string().min(5).max(100).optional(),
	description: z.string().min(20).max(1000).optional(),
	price: z.number().positive().optional(),
	priceType: z.enum(["fixed", "hourly"]).optional(),
	categoryId: z.string().cuid().optional(),
	duration: z.number().min(15).optional(),
	location: z.string().optional(),
	maxBookings: z.number().min(1).optional(),
	images: z.array(z.string().url()).max(5).optional(),
});

export const updateServiceStatusSchema = z.object({
	serviceId: z.string().cuid(),
	status: z.enum(["active", "inactive"]),
});

export const getServiceByIdSchema = z.object({
	serviceId: z.string().cuid(),
});

export const listServicesByProviderSchema = z.object({
	providerId: z.string().cuid(),
	status: z.enum(["active", "inactive", "all"]).default("active"),
	limit: z.number().min(1).max(100).default(20),
	cursor: z.string().optional(),
});

export const listMyServicesSchema = z.object({
	status: z.enum(["active", "inactive", "all"]).default("all"),
	limit: z.number().min(1).max(100).default(20),
	cursor: z.string().optional(),
});

export const deleteServiceSchema = z.object({
	serviceId: z.string().cuid(),
});

export const getServiceStatsSchema = z.object({
	serviceId: z.string().cuid(),
});

export type CreateServiceInput = z.infer<typeof createServiceSchema>;
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>;
export type UpdateServiceStatusInput = z.infer<
	typeof updateServiceStatusSchema
>;
export type GetServiceByIdInput = z.infer<typeof getServiceByIdSchema>;
export type ListServicesByProviderInput = z.infer<
	typeof listServicesByProviderSchema
>;
export type ListMyServicesInput = z.infer<typeof listMyServicesSchema>;
export type DeleteServiceInput = z.infer<typeof deleteServiceSchema>;
export type GetServiceStatsInput = z.infer<typeof getServiceStatsSchema>;

// Dependencies interface
interface ServiceServiceDependencies {
	db: PrismaClient;
	currentUser?: User;
}

export class ServiceService {
	constructor(private deps: ServiceServiceDependencies) {}

	async createService(input: CreateServiceInput) {
		if (!this.deps.currentUser) {
			throw new TRPCError({
				code: "UNAUTHORIZED",
				message: "User not authenticated",
			});
		}

		// Verify user is professional
		if (!this.deps.currentUser.isProfessional) {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: "Only professionals can create services",
			});
		}

		// Verify category exists
		const category = await this.deps.db.category.findUnique({
			where: { id: input.categoryId },
		});

		if (!category) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Category not found",
			});
		}

		// Create service
		const service = await this.deps.db.service.create({
			data: {
				title: input.title,
				description: input.description,
				price: input.price,
				priceType: input.priceType,
				categoryId: input.categoryId,
				providerId: this.deps.currentUser.id,
				duration: input.duration,
				location: input.location,
				maxBookings: input.maxBookings,
				status: "active",
			},
		});

		// Add images if provided
		if (input.images && input.images.length > 0) {
			await this.deps.db.image.createMany({
				data: input.images.map((url) => ({
					url,
					serviceId: service.id,
				})),
			});
		}

		return service;
	}

	async updateService(input: UpdateServiceInput) {
		if (!this.deps.currentUser) {
			throw new TRPCError({
				code: "UNAUTHORIZED",
				message: "User not authenticated",
			});
		}

		const { serviceId, images, ...updateData } = input;

		// Verify service exists and belongs to user
		const service = await this.deps.db.service.findUnique({
			where: { id: serviceId },
		});

		if (!service) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Service not found",
			});
		}

		if (service.providerId !== this.deps.currentUser.id) {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: "You can only update your own services",
			});
		}

		// Verify category if updating
		if (updateData.categoryId) {
			const category = await this.deps.db.category.findUnique({
				where: { id: updateData.categoryId },
			});

			if (!category) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Category not found",
				});
			}
		}

		// Update service
		const updatedService = await this.deps.db.service.update({
			where: { id: serviceId },
			data: updateData,
		});

		// Update images if provided
		if (images !== undefined) {
			// Delete existing images
			await this.deps.db.image.deleteMany({
				where: { serviceId: service.id },
			});

			// Add new images
			if (images.length > 0) {
				await this.deps.db.image.createMany({
					data: images.map((url) => ({
						url,
						serviceId: service.id,
					})),
				});
			}
		}

		return updatedService;
	}

	async updateServiceStatus(input: UpdateServiceStatusInput) {
		if (!this.deps.currentUser) {
			throw new TRPCError({
				code: "UNAUTHORIZED",
				message: "User not authenticated",
			});
		}

		// Verify service exists and belongs to user
		const service = await this.deps.db.service.findUnique({
			where: { id: input.serviceId },
		});

		if (!service) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Service not found",
			});
		}

		if (service.providerId !== this.deps.currentUser.id) {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: "You can only update your own services",
			});
		}

		// Check if there are pending bookings before deactivating
		if (input.status === "inactive") {
			const pendingBookings = await this.deps.db.booking.count({
				where: {
					serviceId: service.id,
					status: { in: ["pending", "accepted"] },
				},
			});

			if (pendingBookings > 0) {
				throw new TRPCError({
					code: "CONFLICT",
					message: "Cannot deactivate service with pending bookings",
				});
			}
		}

		// Update service status
		const updatedService = await this.deps.db.service.update({
			where: { id: input.serviceId },
			data: { status: input.status },
		});

		return updatedService;
	}

	async getServiceById(input: GetServiceByIdInput) {
		const service = await this.deps.db.service.findUnique({
			where: { id: input.serviceId },
			include: {
				category: true,
				provider: {
					select: {
						id: true,
						name: true,
						image: true,
						bio: true,
						isProfessional: true,
						professionalSince: true,
					},
				},
				images: true,
				reviews: {
					take: 5,
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
				},
				_count: {
					select: {
						bookings: true,
						reviews: true,
					},
				},
			},
		});

		if (!service) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Service not found",
			});
		}

		// Increment view count
		await this.deps.db.service.update({
			where: { id: service.id },
			data: { viewCount: { increment: 1 } },
		});

		return service;
	}

	async listServicesByProvider(input: ListServicesByProviderInput) {
		const where: Record<string, unknown> = { providerId: input.providerId };

		if (input.status !== "all") {
			where.status = input.status;
		}

		const services = await this.deps.db.service.findMany({
			where,
			take: input.limit + 1,
			cursor: input.cursor ? { id: input.cursor } : undefined,
			orderBy: { createdAt: "desc" },
			include: {
				category: true,
				images: { take: 1 },
				_count: {
					select: {
						bookings: true,
						reviews: true,
					},
				},
			},
		});

		let nextCursor: string | undefined = undefined;
		if (services.length > input.limit) {
			const nextItem = services.pop();
			nextCursor = nextItem?.id;
		}

		return {
			services,
			nextCursor,
		};
	}

	async listMyServices(input: ListMyServicesInput) {
		if (!this.deps.currentUser) {
			throw new TRPCError({
				code: "UNAUTHORIZED",
				message: "User not authenticated",
			});
		}

		const where: Record<string, unknown> = {
			providerId: this.deps.currentUser.id,
		};

		if (input.status !== "all") {
			where.status = input.status;
		}

		const services = await this.deps.db.service.findMany({
			where,
			take: input.limit + 1,
			cursor: input.cursor ? { id: input.cursor } : undefined,
			orderBy: { createdAt: "desc" },
			include: {
				category: true,
				images: { take: 1 },
				_count: {
					select: {
						bookings: true,
						reviews: true,
					},
				},
			},
		});

		let nextCursor: string | undefined = undefined;
		if (services.length > input.limit) {
			const nextItem = services.pop();
			nextCursor = nextItem?.id;
		}

		// Calculate total earnings for each service
		const servicesWithEarnings = await Promise.all(
			services.map(async (service) => {
				const earnings = await this.deps.db.payment.aggregate({
					where: {
						booking: {
							serviceId: service.id,
							status: "completed",
						},
						status: "paid",
						releasedAt: { not: null },
					},
					_sum: { netAmount: true },
				});

				return {
					...service,
					totalEarnings: earnings._sum.netAmount || 0,
				};
			}),
		);

		return {
			services: servicesWithEarnings,
			nextCursor,
		};
	}

	async deleteService(input: DeleteServiceInput) {
		if (!this.deps.currentUser) {
			throw new TRPCError({
				code: "UNAUTHORIZED",
				message: "User not authenticated",
			});
		}

		// Verify service exists and belongs to user
		const service = await this.deps.db.service.findUnique({
			where: { id: input.serviceId },
		});

		if (!service) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Service not found",
			});
		}

		if (service.providerId !== this.deps.currentUser.id) {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: "You can only delete your own services",
			});
		}

		// Check if there are any bookings
		const bookingCount = await this.deps.db.booking.count({
			where: {
				serviceId: service.id,
				status: { not: "cancelled" },
			},
		});

		if (bookingCount > 0) {
			throw new TRPCError({
				code: "CONFLICT",
				message:
					"Cannot delete service with existing bookings. Deactivate it instead.",
			});
		}

		// Delete service (cascade will handle images)
		await this.deps.db.service.delete({
			where: { id: input.serviceId },
		});

		return { success: true };
	}

	async getServiceStats(input: GetServiceStatsInput) {
		if (!this.deps.currentUser) {
			throw new TRPCError({
				code: "UNAUTHORIZED",
				message: "User not authenticated",
			});
		}

		// Verify service belongs to user
		const service = await this.deps.db.service.findUnique({
			where: { id: input.serviceId },
		});

		if (!service || service.providerId !== this.deps.currentUser.id) {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: "You can only view stats for your own services",
			});
		}

		// Get booking statistics
		const bookingStats = await this.deps.db.booking.groupBy({
			by: ["status"],
			where: { serviceId: service.id },
			_count: { status: true },
		});

		// Get earnings
		const earnings = await this.deps.db.payment.aggregate({
			where: {
				booking: {
					serviceId: service.id,
					status: "completed",
				},
				status: "paid",
			},
			_sum: { netAmount: true },
		});

		// Get review statistics
		const reviewStats = await this.deps.db.review.aggregate({
			where: { serviceId: service.id },
			_avg: { rating: true },
			_count: { rating: true },
		});

		// Get rating distribution
		const ratingDistribution = await this.deps.db.review.groupBy({
			by: ["rating"],
			where: { serviceId: service.id },
			_count: { rating: true },
		});

		// Get monthly booking trends (last 6 months)
		const sixMonthsAgo = new Date();
		sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

		const monthlyBookings = await this.deps.db.booking.findMany({
			where: {
				serviceId: service.id,
				createdAt: { gte: sixMonthsAgo },
			},
			select: {
				createdAt: true,
				status: true,
			},
		});

		// Group by month
		const monthlyTrends = monthlyBookings.reduce(
			(acc, booking) => {
				const monthKey = booking.createdAt.toISOString().slice(0, 7); // YYYY-MM
				if (!acc[monthKey]) {
					acc[monthKey] = { total: 0, completed: 0 };
				}
				acc[monthKey].total++;
				if (booking.status === "completed") {
					acc[monthKey].completed++;
				}
				return acc;
			},
			{} as Record<string, { total: number; completed: number }>,
		);

		return {
			service: {
				id: service.id,
				title: service.title,
				viewCount: service.viewCount,
			},
			bookings: {
				total: bookingStats.reduce((sum, stat) => sum + stat._count.status, 0),
				byStatus: bookingStats.reduce(
					(acc, stat) => {
						acc[stat.status] = stat._count.status;
						return acc;
					},
					{} as Record<string, number>,
				),
			},
			earnings: {
				total: earnings._sum.netAmount || 0,
			},
			reviews: {
				count: reviewStats._count.rating,
				averageRating: reviewStats._avg.rating || 0,
				distribution: ratingDistribution.reduce(
					(acc, dist) => {
						acc[dist.rating] = dist._count.rating;
						return acc;
					},
					{} as Record<number, number>,
				),
			},
			monthlyTrends,
		};
	}
}

// Export factory function for easy instantiation
export const createServiceService = (deps: ServiceServiceDependencies) =>
	new ServiceService(deps);
