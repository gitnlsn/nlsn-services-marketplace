import type { PrismaClient } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { embedText } from "~/server/services/embeddings";

// Input schemas
export const searchServicesInputSchema = z.object({
	query: z.string().min(3).max(200),
	categoryId: z.string().cuid().optional(),
	minPrice: z.number().positive().optional(),
	maxPrice: z.number().positive().optional(),
	location: z.string().optional(),
	priceType: z.enum(["fixed", "hourly", "all"]).default("all"),
	limit: z.number().min(1).max(50).default(20),
	offset: z.number().min(0).default(0),
});

export const getPopularSearchesInputSchema = z.object({
	limit: z.number().min(1).max(20).default(10),
});

export const getSuggestionsInputSchema = z.object({
	query: z.string().min(2).max(50),
	limit: z.number().min(1).max(10).default(5),
});

export const getPriceRangeInputSchema = z.object({
	categoryId: z.string().cuid().optional(),
});

export type SearchServicesInput = z.infer<typeof searchServicesInputSchema>;
export type GetPopularSearchesInput = z.infer<
	typeof getPopularSearchesInputSchema
>;
export type GetSuggestionsInput = z.infer<typeof getSuggestionsInputSchema>;
export type GetPriceRangeInput = z.infer<typeof getPriceRangeInputSchema>;

interface SearchServiceDependencies {
	db: PrismaClient;
}

export class SearchService {
	constructor(private deps: SearchServiceDependencies) {}

	async searchServices(input: SearchServicesInput) {
		// Generate embedding for search query
		let queryEmbedding: number[] | null = null;
		try {
			queryEmbedding = await embedText(input.query);
		} catch (error) {
			console.error("Failed to generate query embedding:", error);
			// Fall back to text search if embedding fails
		}

		// Build WHERE conditions
		const whereConditions: Record<string, unknown> = {
			status: "active",
		};

		if (input.categoryId) {
			whereConditions.categoryId = input.categoryId;
		}

		if (input.priceType !== "all") {
			whereConditions.priceType = input.priceType;
		}

		if (input.location) {
			whereConditions.location = {
				contains: input.location,
				mode: "insensitive",
			};
		}

		if (input.minPrice !== undefined || input.maxPrice !== undefined) {
			const priceFilter: { gte?: number; lte?: number } = {};
			if (input.minPrice !== undefined) {
				priceFilter.gte = input.minPrice;
			}
			if (input.maxPrice !== undefined) {
				priceFilter.lte = input.maxPrice;
			}
			whereConditions.price = priceFilter;
		}

		let services: unknown;
		let totalCount: number;

		if (queryEmbedding) {
			// Perform vector similarity search
			const result = await this.performVectorSearch(
				input,
				queryEmbedding,
				whereConditions,
			);
			services = result.services;
			totalCount = result.totalCount;
		} else {
			// Fall back to text search if embedding generation failed
			const result = await this.performTextSearch(input, whereConditions);
			services = result.services;
			totalCount = result.totalCount;
		}

		return {
			services,
			totalCount,
			hasMore: input.offset + (services as unknown[]).length < totalCount,
		};
	}

	private async performVectorSearch(
		input: SearchServicesInput,
		queryEmbedding: number[],
		whereConditions: Record<string, unknown>,
	) {
		const embeddingString = `[${queryEmbedding.join(",")}]`;

		// Build dynamic WHERE clause for raw SQL
		const conditions = ["status = 'active'"];
		const params: unknown[] = [];

		if (input.categoryId) {
			conditions.push(`"categoryId" = $${params.length + 1}`);
			params.push(input.categoryId);
		}

		if (input.priceType !== "all") {
			conditions.push(`"priceType" = $${params.length + 1}`);
			params.push(input.priceType);
		}

		if (input.minPrice !== undefined) {
			conditions.push(`price >= $${params.length + 1}`);
			params.push(input.minPrice);
		}

		if (input.maxPrice !== undefined) {
			conditions.push(`price <= $${params.length + 1}`);
			params.push(input.maxPrice);
		}

		if (input.location) {
			conditions.push(`location ILIKE $${params.length + 1}`);
			params.push(`%${input.location}%`);
		}

		const whereClause = conditions.join(" AND ");

		// Raw SQL for vector similarity search with pgvector
		const searchResults = await this.deps.db.$queryRaw<
			Array<{
				id: string;
				similarity: number;
			}>
		>`
			SELECT 
				id,
				1 - (embedding <=> ${embeddingString}::vector) as similarity
			FROM "Service"
			WHERE ${whereClause}
			ORDER BY embedding <=> ${embeddingString}::vector
			LIMIT ${input.limit}
			OFFSET ${input.offset}
		`;

		// Get full service details for the matched IDs
		const serviceIds = searchResults.map((r) => r.id);
		const services = await this.deps.db.service.findMany({
			where: {
				id: { in: serviceIds },
			},
			include: {
				category: true,
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
		});

		// Sort services by similarity score
		const similarityMap = new Map(
			searchResults.map((r) => [r.id, r.similarity]),
		);
		(services as Array<{ id: string }>).sort((a, b) => {
			const simA = similarityMap.get(a.id) || 0;
			const simB = similarityMap.get(b.id) || 0;
			return simB - simA;
		});

		// Get total count
		const countResult = await this.deps.db.$queryRaw<[{ count: bigint }]>`
			SELECT COUNT(*) as count
			FROM "Service"
			WHERE ${whereClause}
		`;
		const totalCount = Number(countResult[0].count);

		return { services, totalCount };
	}

	private async performTextSearch(
		input: SearchServicesInput,
		whereConditions: Record<string, unknown>,
	) {
		// Add text search conditions
		whereConditions.OR = [
			{
				title: {
					contains: input.query,
					mode: "insensitive",
				},
			},
			{
				description: {
					contains: input.query,
					mode: "insensitive",
				},
			},
		];

		// Get services with text search
		const [services, totalCount] = await this.deps.db.$transaction([
			this.deps.db.service.findMany({
				where: whereConditions,
				skip: input.offset,
				take: input.limit,
				orderBy: [
					{ avgRating: "desc" },
					{ bookingCount: "desc" },
					{ createdAt: "desc" },
				],
				include: {
					category: true,
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
			this.deps.db.service.count({ where: whereConditions }),
		]);

		return { services, totalCount };
	}

	async getPopularSearches(input: GetPopularSearchesInput) {
		// In a real implementation, you would track search queries
		// For now, return popular categories as suggestions
		const popularCategories = await this.deps.db.category.findMany({
			take: input.limit,
			orderBy: {
				services: {
					_count: "desc",
				},
			},
			select: {
				id: true,
				name: true,
				_count: {
					select: {
						services: true,
					},
				},
			},
		});

		return popularCategories.map((cat) => ({
			term: cat.name,
			count: cat._count.services,
			categoryId: cat.id,
		}));
	}

	async getSuggestions(input: GetSuggestionsInput) {
		// Search for matching service titles
		const services = await this.deps.db.service.findMany({
			where: {
				status: "active",
				title: {
					contains: input.query,
					mode: "insensitive",
				},
			},
			select: {
				id: true,
				title: true,
				category: {
					select: {
						name: true,
					},
				},
			},
			take: input.limit,
		});

		// Search for matching categories
		const categories = await this.deps.db.category.findMany({
			where: {
				name: {
					contains: input.query,
					mode: "insensitive",
				},
			},
			select: {
				id: true,
				name: true,
			},
			take: input.limit,
		});

		return {
			services: services.map((s) => ({
				id: s.id,
				title: s.title,
				type: "service" as const,
				category: s.category.name,
			})),
			categories: categories.map((c) => ({
				id: c.id,
				name: c.name,
				type: "category" as const,
			})),
		};
	}

	async getCategories() {
		const categories = await this.deps.db.category.findMany({
			orderBy: { name: "asc" },
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

		return categories.map((cat) => ({
			id: cat.id,
			name: cat.name,
			serviceCount: cat._count.services,
		}));
	}

	async getPriceRange(input: GetPriceRangeInput) {
		const where: Record<string, unknown> = { status: "active" };
		if (input.categoryId) {
			where.categoryId = input.categoryId;
		}

		const result = await this.deps.db.service.aggregate({
			where,
			_min: { price: true },
			_max: { price: true },
		});

		return {
			min: result._min.price || 0,
			max: result._max.price || 1000,
		};
	}
}

export function createSearchService(
	deps: SearchServiceDependencies,
): SearchService {
	return new SearchService(deps);
}
