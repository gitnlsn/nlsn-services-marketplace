import {
	createTRPCRouter,
	protectedProcedure,
	publicProcedure,
} from "~/server/api/trpc";
import {
	createServiceSchema,
	createServiceService,
	deleteServiceSchema,
	getServiceByIdSchema,
	getServiceStatsSchema,
	listMyServicesSchema,
	listServicesByProviderSchema,
	updateServiceSchema,
	updateServiceStatusSchema,
} from "~/server/services/service-service";

export const serviceRouter = createTRPCRouter({
	// Create a new service (professional only)
	create: protectedProcedure
		.input(createServiceSchema)
		.mutation(async ({ ctx, input }) => {
			const currentUser = await ctx.db.user.findUnique({
				where: { id: ctx.session.user.id },
			});
			if (!currentUser) {
				throw new Error("User not found");
			}
			const serviceService = createServiceService({
				db: ctx.db,
				currentUser,
			});
			return await serviceService.createService(input);
		}),

	// Update service details (professional only)
	update: protectedProcedure
		.input(updateServiceSchema)
		.mutation(async ({ ctx, input }) => {
			const currentUser = await ctx.db.user.findUnique({
				where: { id: ctx.session.user.id },
			});
			if (!currentUser) {
				throw new Error("User not found");
			}
			const serviceService = createServiceService({
				db: ctx.db,
				currentUser,
			});
			return await serviceService.updateService(input);
		}),

	// Update service status (active/inactive)
	updateStatus: protectedProcedure
		.input(updateServiceStatusSchema)
		.mutation(async ({ ctx, input }) => {
			const currentUser = await ctx.db.user.findUnique({
				where: { id: ctx.session.user.id },
			});
			if (!currentUser) {
				throw new Error("User not found");
			}
			const serviceService = createServiceService({
				db: ctx.db,
				currentUser,
			});
			return await serviceService.updateServiceStatus(input);
		}),

	// Get service by ID (public)
	getById: publicProcedure
		.input(getServiceByIdSchema)
		.query(async ({ ctx, input }) => {
			const serviceService = createServiceService({
				db: ctx.db,
			});
			return await serviceService.getServiceById(input);
		}),

	// List services by provider
	listByProvider: publicProcedure
		.input(listServicesByProviderSchema)
		.query(async ({ ctx, input }) => {
			const serviceService = createServiceService({
				db: ctx.db,
			});
			return await serviceService.listServicesByProvider(input);
		}),

	// List user's own services (professional only)
	listMyServices: protectedProcedure
		.input(listMyServicesSchema)
		.query(async ({ ctx, input }) => {
			const currentUser = await ctx.db.user.findUnique({
				where: { id: ctx.session.user.id },
			});
			if (!currentUser) {
				throw new Error("User not found");
			}
			const serviceService = createServiceService({
				db: ctx.db,
				currentUser,
			});
			return await serviceService.listMyServices(input);
		}),

	// Delete service (professional only)
	delete: protectedProcedure
		.input(deleteServiceSchema)
		.mutation(async ({ ctx, input }) => {
			const currentUser = await ctx.db.user.findUnique({
				where: { id: ctx.session.user.id },
			});
			if (!currentUser) {
				throw new Error("User not found");
			}
			const serviceService = createServiceService({
				db: ctx.db,
				currentUser,
			});
			return await serviceService.deleteService(input);
		}),

	// Get service statistics (professional only)
	getStats: protectedProcedure
		.input(getServiceStatsSchema)
		.query(async ({ ctx, input }) => {
			const currentUser = await ctx.db.user.findUnique({
				where: { id: ctx.session.user.id },
			});
			if (!currentUser) {
				throw new Error("User not found");
			}
			const serviceService = createServiceService({
				db: ctx.db,
				currentUser,
			});
			return await serviceService.getServiceStats(input);
		}),
});
