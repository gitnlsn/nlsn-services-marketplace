import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { geocodingService } from "~/server/services/geocoding-service";

export const geocodingRouter = createTRPCRouter({
	/**
	 * Geocode a single address
	 */
	geocode: publicProcedure
		.input(
			z.object({
				address: z.string().min(1, "Address is required"),
			}),
		)
		.query(async ({ input }) => {
			const result = await geocodingService.geocode(input.address);
			return result;
		}),

	/**
	 * Batch geocode multiple addresses
	 */
	batchGeocode: publicProcedure
		.input(
			z.object({
				addresses: z.array(z.string()).min(1).max(50), // Limit batch size
			}),
		)
		.query(async ({ input }) => {
			const results = await geocodingService.batchGeocode(input.addresses);
			return results;
		}),

	/**
	 * Get cache statistics (useful for monitoring)
	 */
	getCacheStats: publicProcedure.query(() => {
		return {
			cacheSize: geocodingService.getCacheSize(),
		};
	}),
});
