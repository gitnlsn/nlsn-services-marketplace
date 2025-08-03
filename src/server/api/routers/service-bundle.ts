import { z } from "zod";
import {
	createTRPCRouter,
	protectedProcedure,
	publicProcedure,
} from "~/server/api/trpc";
import { ServiceBundleService } from "~/server/services/service-bundle-service";

export const serviceBundleRouter = createTRPCRouter({
	/**
	 * Create a new service bundle
	 */
	create: protectedProcedure
		.input(
			z.object({
				name: z.string().min(3).max(100),
				description: z.string().optional(),
				serviceIds: z.array(z.string().cuid()).min(2),
				discount: z.number().min(0).max(100),
				validFrom: z.date().optional(),
				validUntil: z.date().optional(),
				maxUses: z.number().min(1).optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const service = new ServiceBundleService({
				db: ctx.db,
				currentUserId: ctx.session.user.id,
			});

			return await service.createBundle(input);
		}),

	/**
	 * Update an existing bundle
	 */
	update: protectedProcedure
		.input(
			z.object({
				id: z.string().cuid(),
				name: z.string().min(3).max(100).optional(),
				description: z.string().optional(),
				discount: z.number().min(0).max(100).optional(),
				validUntil: z.date().optional(),
				maxUses: z.number().min(1).optional(),
				isActive: z.boolean().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const service = new ServiceBundleService({
				db: ctx.db,
				currentUserId: ctx.session.user.id,
			});

			return await service.updateBundle(input);
		}),

	/**
	 * Get bundles for a provider (own bundles)
	 */
	myBundles: protectedProcedure.query(async ({ ctx }) => {
		const service = new ServiceBundleService({
			db: ctx.db,
			currentUserId: ctx.session.user.id,
		});

		return await service.getProviderBundles();
	}),

	/**
	 * Get active bundles for a provider (public view)
	 */
	getProviderBundles: publicProcedure
		.input(z.object({ providerId: z.string().cuid() }))
		.query(async ({ ctx, input }) => {
			const service = new ServiceBundleService({
				db: ctx.db,
				currentUserId: "", // Not needed for public view
			});

			return await service.getActiveBundles(input.providerId);
		}),

	/**
	 * Get bundle details
	 */
	getDetails: publicProcedure
		.input(z.object({ id: z.string().cuid() }))
		.query(async ({ ctx, input }) => {
			const service = new ServiceBundleService({
				db: ctx.db,
				currentUserId: "", // Not needed for public view
			});

			return await service.getBundleDetails(input.id);
		}),

	/**
	 * Apply bundle to booking (used during checkout)
	 */
	applyToBooking: protectedProcedure
		.input(
			z.object({
				bundleId: z.string().cuid(),
				serviceIds: z.array(z.string().cuid()),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const service = new ServiceBundleService({
				db: ctx.db,
				currentUserId: ctx.session.user.id,
			});

			return await service.applyBundleToBooking(
				input.bundleId,
				input.serviceIds,
			);
		}),

	/**
	 * Delete (deactivate) a bundle
	 */
	delete: protectedProcedure
		.input(z.object({ id: z.string().cuid() }))
		.mutation(async ({ ctx, input }) => {
			const service = new ServiceBundleService({
				db: ctx.db,
				currentUserId: ctx.session.user.id,
			});

			return await service.deleteBundle(input.id);
		}),

	/**
	 * Get bundle statistics
	 */
	getStats: protectedProcedure
		.input(z.object({ providerId: z.string().cuid().optional() }).optional())
		.query(async ({ ctx, input }) => {
			const service = new ServiceBundleService({
				db: ctx.db,
				currentUserId: ctx.session.user.id,
			});

			return await service.getBundleStats(input?.providerId);
		}),
});
