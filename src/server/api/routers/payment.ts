import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import {
	createPaymentServiceRouter,
	getPaymentStatusSchema,
	processPaymentSchema,
	releaseEscrowFundsSchema,
	requestRefundSchema,
} from "~/server/services/payment-service";

export const paymentRouter = createTRPCRouter({
	// Process payment for a booking
	processPayment: protectedProcedure
		.input(processPaymentSchema)
		.mutation(async ({ ctx, input }) => {
			const paymentService = createPaymentServiceRouter({
				db: ctx.db,
				currentUser: ctx.session.user,
			});
			return await paymentService.processPayment(input);
		}),

	// Get payment status
	getPaymentStatus: protectedProcedure
		.input(getPaymentStatusSchema)
		.query(async ({ ctx, input }) => {
			const paymentService = createPaymentServiceRouter({
				db: ctx.db,
				currentUser: ctx.session.user,
			});
			return await paymentService.getPaymentStatus(input);
		}),

	// Request refund (for cancelled bookings)
	requestRefund: protectedProcedure
		.input(requestRefundSchema)
		.mutation(async ({ ctx, input }) => {
			const paymentService = createPaymentServiceRouter({
				db: ctx.db,
				currentUser: ctx.session.user,
			});
			return await paymentService.requestRefund(input);
		}),

	// Release escrow funds (automated, called by cron job)
	releaseEscrowFunds: protectedProcedure
		.input(releaseEscrowFundsSchema)
		.mutation(async ({ ctx, input }) => {
			const paymentService = createPaymentServiceRouter({
				db: ctx.db,
				currentUser: ctx.session.user,
			});
			return await paymentService.releaseEscrowFunds(input);
		}),
});
