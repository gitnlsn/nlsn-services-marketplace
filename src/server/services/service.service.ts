import type { PrismaClient } from "@prisma/client";
import { TRPCError } from "@trpc/server";

export interface CreateServiceData {
	title: string;
	description: string;
	price: number;
	priceType: "fixed" | "hourly";
	categoryId: string;
	duration?: number;
	location?: string;
	maxBookings?: number;
	images?: string[];
}

export interface UpdateServiceData {
	serviceId: string;
	title?: string;
	description?: string;
	price?: number;
	priceType?: "fixed" | "hourly";
	categoryId?: string;
	duration?: number;
	location?: string;
	maxBookings?: number;
	images?: string[];
}

export interface ServiceFilters {
	providerId?: string;
	status?: "active" | "inactive" | "all";
	limit?: number;
	cursor?: string;
}

export class ServiceService {
	constructor(private db: PrismaClient) {}

	async createService(userId: string, data: CreateServiceData) {
		// Verify user is professional
		const user = await this.db.user.findUnique({
			where: { id: userId },
		});

		if (!user?.isProfessional) {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: "Only professionals can create services",
			});
		}

		// Verify category exists
		const category = await this.db.category.findUnique({
			where: { id: data.categoryId },
		});

		if (!category) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Category not found",
			});
		}

		// Create service
		const service = await this.db.service.create({
			data: {
				title: data.title,
				description: data.description,
				price: data.price,
				priceType: data.priceType,
				categoryId: data.categoryId,
				providerId: userId,
				duration: data.duration,
				location: data.location,
				maxBookings: data.maxBookings,
				status: "active",
			},
		});

		// Add images if provided
		if (data.images && data.images.length > 0) {
			await this.db.image.createMany({
				data: data.images.map((url) => ({
					url,
					serviceId: service.id,
				})),
			});
		}

		return service;
	}

	async updateService(userId: string, data: UpdateServiceData) {
		const { serviceId, images, ...updateData } = data;

		// Verify service exists and belongs to user
		const service = await this.db.service.findUnique({
			where: { id: serviceId },
		});

		if (!service) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Service not found",
			});
		}

		if (service.providerId !== userId) {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: "You can only update your own services",
			});
		}

		// Verify category if updating
		if (updateData.categoryId) {
			const category = await this.db.category.findUnique({
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
		const updatedService = await this.db.service.update({
			where: { id: serviceId },
			data: updateData,
		});

		// Update images if provided
		if (images !== undefined) {
			// Delete existing images
			await this.db.image.deleteMany({
				where: { serviceId: service.id },
			});

			// Add new images
			if (images.length > 0) {
				await this.db.image.createMany({
					data: images.map((url) => ({
						url,
						serviceId: service.id,
					})),
				});
			}
		}

		return updatedService;
	}

	async updateServiceStatus(
		userId: string,
		serviceId: string,
		status: "active" | "inactive",
	) {
		// Verify service exists and belongs to user
		const service = await this.db.service.findUnique({
			where: { id: serviceId },
		});

		if (!service) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Service not found",
			});
		}

		if (service.providerId !== userId) {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: "You can only update your own services",
			});
		}

		// Check if there are pending bookings before deactivating
		if (status === "inactive") {
			const pendingBookings = await this.db.booking.count({
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
		const updatedService = await this.db.service.update({
			where: { id: serviceId },
			data: { status },
		});

		return updatedService;
	}

	async getServiceById(serviceId: string) {
		const service = await this.db.service.findUnique({
			where: { id: serviceId },
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
		await this.db.service.update({
			where: { id: service.id },
			data: { viewCount: { increment: 1 } },
		});

		return service;
	}

	async listServicesByProvider(filters: ServiceFilters) {
		const where: Record<string, unknown> = { providerId: filters.providerId };

		if (filters.status !== "all") {
			where.status = filters.status;
		}

		const limit = filters.limit || 20;

		const services = await this.db.service.findMany({
			where,
			take: limit + 1,
			cursor: filters.cursor ? { id: filters.cursor } : undefined,
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
		if (services.length > limit) {
			const nextItem = services.pop();
			nextCursor = nextItem?.id;
		}

		return {
			services,
			nextCursor,
		};
	}

	async listMyServices(userId: string, filters: ServiceFilters) {
		const where: Record<string, unknown> = {
			providerId: userId,
		};

		if (filters.status !== "all") {
			where.status = filters.status;
		}

		const limit = filters.limit || 20;

		const services = await this.db.service.findMany({
			where,
			take: limit + 1,
			cursor: filters.cursor ? { id: filters.cursor } : undefined,
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
		if (services.length > limit) {
			const nextItem = services.pop();
			nextCursor = nextItem?.id;
		}

		// Calculate total earnings for each service
		const servicesWithEarnings = await Promise.all(
			services.map(async (service) => {
				const earnings = await this.db.payment.aggregate({
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

	async deleteService(userId: string, serviceId: string) {
		// Verify service exists and belongs to user
		const service = await this.db.service.findUnique({
			where: { id: serviceId },
		});

		if (!service) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Service not found",
			});
		}

		if (service.providerId !== userId) {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: "You can only delete your own services",
			});
		}

		// Check if there are any bookings
		const bookingCount = await this.db.booking.count({
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
		await this.db.service.delete({
			where: { id: serviceId },
		});

		return { success: true };
	}

	async getServiceStats(userId: string, serviceId: string) {
		// Verify service belongs to user
		const service = await this.db.service.findUnique({
			where: { id: serviceId },
		});

		if (!service || service.providerId !== userId) {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: "You can only view stats for your own services",
			});
		}

		// Get booking statistics
		const bookingStats = await this.db.booking.groupBy({
			by: ["status"],
			where: { serviceId: service.id },
			_count: { status: true },
		});

		// Get earnings
		const earnings = await this.db.payment.aggregate({
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
		const reviewStats = await this.db.review.aggregate({
			where: { serviceId: service.id },
			_avg: { rating: true },
			_count: { rating: true },
		});

		// Get rating distribution
		const ratingDistribution = await this.db.review.groupBy({
			by: ["rating"],
			where: { serviceId: service.id },
			_count: { rating: true },
		});

		// Get monthly booking trends (last 6 months)
		const sixMonthsAgo = new Date();
		sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

		const monthlyBookings = await this.db.booking.findMany({
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
