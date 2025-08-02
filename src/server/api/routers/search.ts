import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import {
	createSearchService,
	getPopularSearchesInputSchema,
	getPriceRangeInputSchema,
	getSuggestionsInputSchema,
	searchServicesInputSchema,
} from "~/server/services/search-service";

export const searchRouter = createTRPCRouter({
	// Search services with semantic search
	searchServices: publicProcedure
		.input(searchServicesInputSchema)
		.query(async ({ ctx, input }) => {
			const searchService = createSearchService({ db: ctx.db });
			return await searchService.searchServices(input);
		}),

	// Get popular search terms
	getPopularSearches: publicProcedure
		.input(getPopularSearchesInputSchema)
		.query(async ({ ctx, input }) => {
			const searchService = createSearchService({ db: ctx.db });
			return await searchService.getPopularSearches(input);
		}),

	// Search suggestions (autocomplete)
	getSuggestions: publicProcedure
		.input(getSuggestionsInputSchema)
		.query(async ({ ctx, input }) => {
			const searchService = createSearchService({ db: ctx.db });
			return await searchService.getSuggestions(input);
		}),

	// Get all categories for filters
	getCategories: publicProcedure.query(async ({ ctx }) => {
		const searchService = createSearchService({ db: ctx.db });
		return await searchService.getCategories();
	}),

	// Get price range for filters
	getPriceRange: publicProcedure
		.input(getPriceRangeInputSchema)
		.query(async ({ ctx, input }) => {
			const searchService = createSearchService({ db: ctx.db });
			return await searchService.getPriceRange(input);
		}),
});
