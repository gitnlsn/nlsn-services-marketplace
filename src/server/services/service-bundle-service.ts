import type { Prisma, PrismaClient } from "@prisma/client";
import { TRPCError } from "@trpc/server";

interface ServiceBundleDeps {
	db: PrismaClient;
	currentUserId: string;
}

interface CreateBundleInput {
	name: string;
	description?: string;
	serviceIds: string[];
	discount: number; // Percentage discount
	validFrom?: Date;
	validUntil?: Date;
	maxUses?: number;
}

interface UpdateBundleInput {
	id: string;
	name?: string;
	description?: string;
	discount?: number;
	validUntil?: Date;
	maxUses?: number;
	isActive?: boolean;
}

export class ServiceBundleService {
	constructor(private deps: ServiceBundleDeps) {}

	/**
	 * Create a new service bundle
	 */
	async createBundle(input: CreateBundleInput) {
		// Validate that user owns all services
		const services = await this.deps.db.service.findMany({
			where: {
				id: { in: input.serviceIds },
				providerId: this.deps.currentUserId,
			},
		});

		if (services.length !== input.serviceIds.length) {
			throw new TRPCError({
				code: "UNAUTHORIZED",
				message: "You can only bundle your own services",
			});
		}

		// Validate discount
		if (input.discount < 0 || input.discount > 100) {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: "Discount must be between 0 and 100 percent",
			});
		}

		// Create the bundle
		const bundle = await this.deps.db.serviceBundle.create({
			data: {
				name: input.name,
				description: input.description,
				providerId: this.deps.currentUserId,
				discount: input.discount,
				validFrom: input.validFrom || new Date(),
				validUntil: input.validUntil,
				maxUses: input.maxUses,
				isActive: true,
				services: {
					connect: input.serviceIds.map((id) => ({ id })),
				},
			},
			include: {
				services: true,
			},
		});

		return bundle;
	}

	/**
	 * Update an existing bundle
	 */
	async updateBundle(input: UpdateBundleInput) {
		const bundle = await this.deps.db.serviceBundle.findUnique({
			where: { id: input.id },
		});

		if (!bundle) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Bundle not found",
			});
		}

		if (bundle.providerId !== this.deps.currentUserId) {
			throw new TRPCError({
				code: "UNAUTHORIZED",
				message: "You can only update your own bundles",
			});
		}

		if (input.discount !== undefined) {
			if (input.discount < 0 || input.discount > 100) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Discount must be between 0 and 100 percent",
				});
			}
		}

		return await this.deps.db.serviceBundle.update({
			where: { id: input.id },
			data: {
				name: input.name,
				description: input.description,
				discount: input.discount,
				validUntil: input.validUntil,
				maxUses: input.maxUses,
				isActive: input.isActive,
			},
			include: {
				services: true,
			},
		});
	}

	/**
	 * Get bundles for a provider
	 */
	async getProviderBundles(providerId?: string) {
		const actualProviderId = providerId || this.deps.currentUserId;

		return await this.deps.db.serviceBundle.findMany({
			where: {
				providerId: actualProviderId,
			},
			include: {
				services: {
					include: {
						images: true,
						category: true,
					},
				},
				_count: {
					select: { services: true },
				},
			},
			orderBy: { createdAt: "desc" },
		});
	}

	/**
	 * Get active bundles for public display
	 */
	async getActiveBundles(providerId: string) {
		const now = new Date();

		return await this.deps.db.serviceBundle.findMany({
			where: {
				providerId,
				isActive: true,
				validFrom: { lte: now },
				OR: [{ validUntil: null }, { validUntil: { gte: now } }],
			},
			include: {
				services: {
					include: {
						images: true,
						category: true,
					},
				},
			},
			orderBy: { discount: "desc" },
		});
	}

	/**
	 * Get bundle details
	 */
	async getBundleDetails(id: string) {
		const bundle = await this.deps.db.serviceBundle.findUnique({
			where: { id },
			include: {
				services: {
					include: {
						images: true,
						category: true,
						reviews: {
							select: {
								rating: true,
							},
						},
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

		if (!bundle) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Bundle not found",
			});
		}

		// Calculate bundle pricing
		const totalOriginalPrice = bundle.services.reduce(
			(sum, service) => sum + service.price,
			0,
		);
		const discountAmount = (totalOriginalPrice * bundle.discount) / 100;
		const bundlePrice = totalOriginalPrice - discountAmount;

		// Calculate average rating
		const allRatings = bundle.services.flatMap((s) =>
			s.reviews.map((r) => r.rating),
		);
		const avgRating =
			allRatings.length > 0
				? allRatings.reduce((a, b) => a + b, 0) / allRatings.length
				: null;

		return {
			...bundle,
			totalOriginalPrice,
			discountAmount,
			bundlePrice,
			avgRating,
			isValid: this.isBundleValid(bundle),
			remainingUses:
				bundle.maxUses !== null ? bundle.maxUses - bundle.currentUses : null,
		};
	}

	/**
	 * Check if a bundle is currently valid
	 */
	private isBundleValid(bundle: {
		isActive: boolean;
		validFrom: Date;
		validUntil?: Date | null;
		maxUses?: number | null;
		currentUses: number;
	}): boolean {
		const now = new Date();

		if (!bundle.isActive) return false;
		if (bundle.validFrom > now) return false;
		if (bundle.validUntil && bundle.validUntil < now) return false;
		if (bundle.maxUses && bundle.currentUses >= bundle.maxUses) return false;

		return true;
	}

	/**
	 * Apply bundle to a booking
	 */
	async applyBundleToBooking(bundleId: string, serviceIds: string[]) {
		const bundle = await this.deps.db.serviceBundle.findUnique({
			where: { id: bundleId },
			include: {
				services: true,
			},
		});

		if (!bundle) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Bundle not found",
			});
		}

		if (!this.isBundleValid(bundle)) {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: "This bundle is no longer valid",
			});
		}

		// Verify all bundle services are being booked
		const bundleServiceIds = bundle.services.map((s) => s.id);
		const allServicesIncluded = bundleServiceIds.every((id) =>
			serviceIds.includes(id),
		);

		if (!allServicesIncluded) {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: "All bundle services must be booked together",
			});
		}

		// Increment bundle usage
		await this.deps.db.serviceBundle.update({
			where: { id: bundleId },
			data: {
				currentUses: { increment: 1 },
			},
		});

		// Calculate discounted prices
		const services = await this.deps.db.service.findMany({
			where: { id: { in: bundleServiceIds } },
		});

		const discountedPrices = services.map((service) => ({
			serviceId: service.id,
			originalPrice: service.price,
			discountedPrice: service.price * (1 - bundle.discount / 100),
		}));

		return {
			bundleId,
			discount: bundle.discount,
			discountedPrices,
		};
	}

	/**
	 * Toggle bundle active status
	 */
	async toggleBundleStatus(id: string) {
		const bundle = await this.deps.db.serviceBundle.findUnique({
			where: { id },
		});

		if (!bundle) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Bundle not found",
			});
		}

		if (bundle.providerId !== this.deps.currentUserId) {
			throw new TRPCError({
				code: "UNAUTHORIZED",
				message: "You can only toggle your own bundles",
			});
		}

		return await this.deps.db.serviceBundle.update({
			where: { id },
			data: { isActive: !bundle.isActive },
			include: {
				services: true,
			},
		});
	}

	/**
	 * Delete a bundle
	 */
	async deleteBundle(id: string) {
		const bundle = await this.deps.db.serviceBundle.findUnique({
			where: { id },
		});

		if (!bundle) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Bundle not found",
			});
		}

		if (bundle.providerId !== this.deps.currentUserId) {
			throw new TRPCError({
				code: "UNAUTHORIZED",
				message: "You can only delete your own bundles",
			});
		}

		// Soft delete by deactivating
		await this.deps.db.serviceBundle.update({
			where: { id },
			data: { isActive: false },
		});

		return { success: true };
	}

	/**
	 * Search bundles with filters
	 */
	async searchBundles(params: {
		query?: string;
		categoryId?: string;
		minDiscount?: number;
		maxDiscount?: number;
		limit?: number;
		cursor?: string;
	}) {
		const {
			query,
			categoryId,
			minDiscount,
			maxDiscount,
			limit = 10,
			cursor,
		} = params;

		const now = new Date();

		const where: Prisma.ServiceBundleWhereInput = {
			isActive: true,
			validFrom: { lte: now },
			OR: [{ validUntil: null }, { validUntil: { gte: now } }],
		};

		if (query) {
			where.OR = [
				{ name: { contains: query, mode: "insensitive" } },
				{ description: { contains: query, mode: "insensitive" } },
			];
		}

		if (minDiscount !== undefined) {
			where.discount = { gte: minDiscount };
		}

		if (maxDiscount !== undefined) {
			where.discount = {
				...((where.discount as object) || {}),
				lte: maxDiscount,
			};
		}

		if (categoryId) {
			where.services = {
				some: {
					categoryId,
				},
			};
		}

		const bundles = await this.deps.db.serviceBundle.findMany({
			where,
			include: {
				services: {
					include: {
						images: true,
						category: true,
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
			orderBy: { discount: "desc" },
			take: limit + 1,
			...(cursor && { cursor: { id: cursor }, skip: 1 }),
		});

		const hasNextPage = bundles.length > limit;
		const items = hasNextPage ? bundles.slice(0, -1) : bundles;

		return {
			bundles: items,
			nextCursor: hasNextPage ? items[items.length - 1]?.id : null,
		};
	}

	/**
	 * Get bundle statistics
	 */
	async getBundleStats(providerId?: string) {
		const actualProviderId = providerId || this.deps.currentUserId;

		const bundles = await this.deps.db.serviceBundle.findMany({
			where: { providerId: actualProviderId },
			select: {
				id: true,
				name: true,
				currentUses: true,
				maxUses: true,
				discount: true,
				services: {
					select: { price: true },
				},
			},
		});

		const stats = bundles.map((bundle) => {
			const totalRevenue =
				bundle.currentUses *
				bundle.services.reduce((sum, s) => sum + s.price, 0) *
				(1 - bundle.discount / 100);

			return {
				bundleId: bundle.id,
				bundleName: bundle.name,
				timesUsed: bundle.currentUses,
				totalRevenue,
				conversionRate:
					bundle.maxUses && bundle.maxUses > 0
						? (bundle.currentUses / bundle.maxUses) * 100
						: null,
			};
		});

		return {
			bundles: stats,
			totalBundleRevenue: stats.reduce((sum, s) => sum + s.totalRevenue, 0),
			mostPopularBundle: stats.sort((a, b) => b.timesUsed - a.timesUsed)[0],
		};
	}
}
