import { z } from "zod";
import {
	createTRPCRouter,
	protectedProcedure,
	publicProcedure,
} from "~/server/api/trpc";

export const serviceAddonRouter = createTRPCRouter({
	/**
	 * Create a service add-on
	 */
	create: protectedProcedure
		.input(
			z.object({
				serviceId: z.string().cuid(),
				name: z.string().min(2).max(100),
				description: z.string().optional(),
				price: z.number().min(0),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// Verify service ownership
			const service = await ctx.db.service.findUnique({
				where: { id: input.serviceId },
			});

			if (!service) {
				throw new Error("Service not found");
			}

			if (service.providerId !== ctx.session.user.id) {
				throw new Error("You can only create add-ons for your own services");
			}

			return await ctx.db.serviceAddOn.create({
				data: input,
			});
		}),

	/**
	 * Update a service add-on
	 */
	update: protectedProcedure
		.input(
			z.object({
				id: z.string().cuid(),
				name: z.string().min(2).max(100).optional(),
				description: z.string().optional(),
				price: z.number().min(0).optional(),
				isActive: z.boolean().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const { id, ...data } = input;

			const addOn = await ctx.db.serviceAddOn.findUnique({
				where: { id },
				include: { service: true },
			});

			if (!addOn) {
				throw new Error("Add-on not found");
			}

			if (addOn.service.providerId !== ctx.session.user.id) {
				throw new Error("You can only update your own add-ons");
			}

			return await ctx.db.serviceAddOn.update({
				where: { id },
				data,
			});
		}),

	/**
	 * Delete a service add-on
	 */
	delete: protectedProcedure
		.input(z.object({ id: z.string().cuid() }))
		.mutation(async ({ ctx, input }) => {
			const addOn = await ctx.db.serviceAddOn.findUnique({
				where: { id: input.id },
				include: { service: true },
			});

			if (!addOn) {
				throw new Error("Add-on not found");
			}

			if (addOn.service.providerId !== ctx.session.user.id) {
				throw new Error("You can only delete your own add-ons");
			}

			// Soft delete by setting isActive to false
			return await ctx.db.serviceAddOn.update({
				where: { id: input.id },
				data: { isActive: false },
			});
		}),

	/**
	 * Get add-ons for a service
	 */
	getByService: publicProcedure
		.input(z.object({ serviceId: z.string().cuid() }))
		.query(async ({ ctx, input }) => {
			return await ctx.db.serviceAddOn.findMany({
				where: {
					serviceId: input.serviceId,
					isActive: true,
				},
				orderBy: { price: "asc" },
			});
		}),

	/**
	 * Get provider's add-ons
	 */
	myAddons: protectedProcedure.query(async ({ ctx }) => {
		return await ctx.db.serviceAddOn.findMany({
			where: {
				service: {
					providerId: ctx.session.user.id,
				},
			},
			include: {
				service: {
					select: {
						id: true,
						title: true,
					},
				},
				_count: {
					select: {
						bookings: true,
					},
				},
			},
			orderBy: { createdAt: "desc" },
		});
	}),
});
