import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import {
	createAdminService,
	getBookingManagementSchema,
	getPaymentManagementSchema,
	getPlatformStatsSchema,
	getServiceManagementSchema,
	getUserManagementSchema,
	resolveDisputeSchema,
	updateServiceStatusSchema,
	updateUserStatusSchema,
} from "~/server/services/admin-service";

/**
 * Admin Router
 *
 * Comprehensive admin panel endpoints for platform management.
 * All endpoints require admin permissions (isProfessional: true).
 */

export const adminRouter = createTRPCRouter({
	/**
	 * Get comprehensive platform statistics
	 */
	getPlatformStats: protectedProcedure
		.input(getPlatformStatsSchema)
		.query(async ({ ctx, input }) => {
			const adminService = createAdminService({
				db: ctx.db,
				currentUser: {
					id: ctx.session.user.id,
					isProfessional: ctx.session.user.isProfessional,
					email: ctx.session.user.email ?? undefined,
				},
			});
			return await adminService.getPlatformStats(input);
		}),

	/**
	 * Get user management data with filtering and pagination
	 */
	getUserManagement: protectedProcedure
		.input(getUserManagementSchema)
		.query(async ({ ctx, input }) => {
			const adminService = createAdminService({
				db: ctx.db,
				currentUser: {
					id: ctx.session.user.id,
					isProfessional: ctx.session.user.isProfessional,
					email: ctx.session.user.email ?? undefined,
				},
			});
			return await adminService.getUserManagement(input);
		}),

	/**
	 * Get service management data with filtering and pagination
	 */
	getServiceManagement: protectedProcedure
		.input(getServiceManagementSchema)
		.query(async ({ ctx, input }) => {
			const adminService = createAdminService({
				db: ctx.db,
				currentUser: {
					id: ctx.session.user.id,
					isProfessional: ctx.session.user.isProfessional,
					email: ctx.session.user.email ?? undefined,
				},
			});
			return await adminService.getServiceManagement(input);
		}),

	/**
	 * Get booking management data with filtering and pagination
	 */
	getBookingManagement: protectedProcedure
		.input(getBookingManagementSchema)
		.query(async ({ ctx, input }) => {
			const adminService = createAdminService({
				db: ctx.db,
				currentUser: {
					id: ctx.session.user.id,
					isProfessional: ctx.session.user.isProfessional,
					email: ctx.session.user.email ?? undefined,
				},
			});
			return await adminService.getBookingManagement(input);
		}),

	/**
	 * Get payment management data with filtering and pagination
	 */
	getPaymentManagement: protectedProcedure
		.input(getPaymentManagementSchema)
		.query(async ({ ctx, input }) => {
			const adminService = createAdminService({
				db: ctx.db,
				currentUser: {
					id: ctx.session.user.id,
					isProfessional: ctx.session.user.isProfessional,
					email: ctx.session.user.email ?? undefined,
				},
			});
			return await adminService.getPaymentManagement(input);
		}),

	/**
	 * Update user status (activate, suspend, delete)
	 */
	updateUserStatus: protectedProcedure
		.input(updateUserStatusSchema)
		.mutation(async ({ ctx, input }) => {
			const adminService = createAdminService({
				db: ctx.db,
				currentUser: {
					id: ctx.session.user.id,
					isProfessional: ctx.session.user.isProfessional,
					email: ctx.session.user.email ?? undefined,
				},
			});
			return await adminService.updateUserStatus(input);
		}),

	/**
	 * Update service status (approve, reject, suspend)
	 */
	updateServiceStatus: protectedProcedure
		.input(updateServiceStatusSchema)
		.mutation(async ({ ctx, input }) => {
			const adminService = createAdminService({
				db: ctx.db,
				currentUser: {
					id: ctx.session.user.id,
					isProfessional: ctx.session.user.isProfessional,
					email: ctx.session.user.email ?? undefined,
				},
			});
			return await adminService.updateServiceStatus(input);
		}),

	/**
	 * Resolve booking disputes
	 */
	resolveDispute: protectedProcedure
		.input(resolveDisputeSchema)
		.mutation(async ({ ctx, input }) => {
			const adminService = createAdminService({
				db: ctx.db,
				currentUser: {
					id: ctx.session.user.id,
					isProfessional: ctx.session.user.isProfessional,
					email: ctx.session.user.email ?? undefined,
				},
			});
			return await adminService.resolveDispute(input);
		}),
});
