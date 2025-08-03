import {
	createTRPCRouter,
	protectedProcedure,
	publicProcedure,
} from "~/server/api/trpc";
import {
	createCategorySchema,
	createCategoryService,
	deleteCategorySchema,
	getCategoryByIdSchema,
	getCategoryServicesSchema,
	getCategoryStatsSchema,
	listCategoriesSchema,
	updateCategorySchema,
} from "~/server/services/category-service";

export const categoryRouter = createTRPCRouter({
	// Get all categories (public)
	list: publicProcedure
		.input(listCategoriesSchema)
		.query(async ({ ctx, input }) => {
			const categoryService = createCategoryService({
				db: ctx.db,
			});
			return await categoryService.list(input);
		}),

	// Get category by ID (public)
	getById: publicProcedure
		.input(getCategoryByIdSchema)
		.query(async ({ ctx, input }) => {
			const categoryService = createCategoryService({
				db: ctx.db,
			});
			return await categoryService.getById(input);
		}),

	// Get services by category (public)
	getServices: publicProcedure
		.input(getCategoryServicesSchema)
		.query(async ({ ctx, input }) => {
			const categoryService = createCategoryService({
				db: ctx.db,
			});
			return await categoryService.getServices(input);
		}),

	// Create category (admin only)
	create: protectedProcedure
		.input(createCategorySchema)
		.mutation(async ({ ctx, input }) => {
			const categoryService = createCategoryService({
				db: ctx.db,
				currentUser: ctx.session.user,
			});
			return await categoryService.create(input);
		}),

	// Update category (admin only)
	update: protectedProcedure
		.input(updateCategorySchema)
		.mutation(async ({ ctx, input }) => {
			const categoryService = createCategoryService({
				db: ctx.db,
				currentUser: ctx.session.user,
			});
			return await categoryService.update(input);
		}),

	// Delete category (admin only)
	delete: protectedProcedure
		.input(deleteCategorySchema)
		.mutation(async ({ ctx, input }) => {
			const categoryService = createCategoryService({
				db: ctx.db,
				currentUser: ctx.session.user,
			});
			return await categoryService.delete(input);
		}),

	// Get category statistics (admin only)
	getStats: protectedProcedure
		.input(getCategoryStatsSchema)
		.query(async ({ ctx, input }) => {
			const categoryService = createCategoryService({
				db: ctx.db,
				currentUser: ctx.session.user,
			});
			return await categoryService.getStats(input);
		}),
});
