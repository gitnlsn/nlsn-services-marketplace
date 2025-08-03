import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import {
	createAdminService,
	getAnalyticsSchema,
	getBookingsSchema,
	getDashboardSchema,
	getServicesSchema,
	getUsersSchema,
	moderateServiceSchema,
	suspendUserSchema,
} from "~/server/services/admin-service";

export const adminRouter = createTRPCRouter({
	// Get dashboard overview (admin only)
	getDashboard: protectedProcedure
		.input(getDashboardSchema)
		.query(async ({ ctx, input }) => {
			const adminService = createAdminService({
				db: ctx.db,
				currentUser: ctx.session.user,
			});
			return await adminService.getDashboard(input);
		}),

	// Get users list (admin only)
	getUsers: protectedProcedure
		.input(getUsersSchema)
		.query(async ({ ctx, input }) => {
			const adminService = createAdminService({
				db: ctx.db,
				currentUser: ctx.session.user,
			});
			return await adminService.getUsers(input);
		}),

	// Get services list (admin only)
	getServices: protectedProcedure
		.input(getServicesSchema)
		.query(async ({ ctx, input }) => {
			const adminService = createAdminService({
				db: ctx.db,
				currentUser: ctx.session.user,
			});
			return await adminService.getServices(input);
		}),

	// Get bookings list (admin only)
	getBookings: protectedProcedure
		.input(getBookingsSchema)
		.query(async ({ ctx, input }) => {
			const adminService = createAdminService({
				db: ctx.db,
				currentUser: ctx.session.user,
			});
			return await adminService.getBookings(input);
		}),

	// Get platform analytics (admin only)
	getAnalytics: protectedProcedure
		.input(getAnalyticsSchema)
		.query(async ({ ctx, input }) => {
			const adminService = createAdminService({
				db: ctx.db,
				currentUser: ctx.session.user,
			});
			return await adminService.getAnalytics(input);
		}),

	// Moderate content (admin only)
	moderateService: protectedProcedure
		.input(moderateServiceSchema)
		.mutation(async ({ ctx, input }) => {
			const adminService = createAdminService({
				db: ctx.db,
				currentUser: ctx.session.user,
			});
			return await adminService.moderateService(input);
		}),

	// Suspend user (admin only)
	suspendUser: protectedProcedure
		.input(suspendUserSchema)
		.mutation(async ({ ctx, input }) => {
			const adminService = createAdminService({
				db: ctx.db,
				currentUser: ctx.session.user,
			});
			return await adminService.suspendUser(input);
		}),
});
