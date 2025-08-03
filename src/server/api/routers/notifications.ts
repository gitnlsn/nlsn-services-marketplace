import { z } from "zod";
import {
	createTRPCRouter,
	protectedProcedure,
	publicProcedure,
} from "~/server/api/trpc";
import {
	NotificationTypes,
	type SendNotificationInput,
	notificationService,
	sendNotificationSchema,
} from "~/server/services/notification-service";

export const notificationsRouter = createTRPCRouter({
	/**
	 * Send notification via multiple channels
	 */
	send: protectedProcedure
		.input(sendNotificationSchema)
		.mutation(async ({ input }) => {
			const result = await notificationService.sendNotification(
				input.type,
				input.recipient,
				input.data || {},
				input.channels || ["sms", "email"],
			);
			return result;
		}),

	/**
	 * Send booking confirmation notification
	 */
	sendBookingConfirmation: protectedProcedure
		.input(
			z.object({
				customerEmail: z.string().email().optional(),
				customerPhone: z.string().optional(),
				customerName: z.string(),
				serviceName: z.string(),
				providerName: z.string(),
				date: z.string(),
				price: z.string(),
				address: z.string().optional(),
			}),
		)
		.mutation(async ({ input }) => {
			const result = await notificationService.sendNotification(
				NotificationTypes.BOOKING_ACCEPTED,
				{
					email: input.customerEmail,
					phone: input.customerPhone,
					name: input.customerName,
				},
				{
					customerName: input.customerName,
					serviceName: input.serviceName,
					providerName: input.providerName,
					date: input.date,
					price: input.price,
					address: input.address || "Local a combinar",
				},
				["email", "sms", "whatsapp"],
			);
			return result;
		}),

	/**
	 * Notify provider of new booking
	 */
	notifyProviderNewBooking: protectedProcedure
		.input(
			z.object({
				providerEmail: z.string().email().optional(),
				providerPhone: z.string().optional(),
				providerName: z.string(),
				customerName: z.string(),
				serviceName: z.string(),
				date: z.string(),
				price: z.string(),
			}),
		)
		.mutation(async ({ input }) => {
			const result = await notificationService.sendNotification(
				NotificationTypes.BOOKING_CREATED,
				{
					email: input.providerEmail,
					phone: input.providerPhone,
					name: input.providerName,
				},
				{
					providerName: input.providerName,
					customerName: input.customerName,
					serviceName: input.serviceName,
					date: input.date,
					price: input.price,
				},
				["email", "sms", "whatsapp"],
			);
			return result;
		}),

	/**
	 * Send booking declined notification
	 */
	sendBookingDeclined: protectedProcedure
		.input(
			z.object({
				customerEmail: z.string().email().optional(),
				customerPhone: z.string().optional(),
				customerName: z.string(),
				serviceName: z.string(),
			}),
		)
		.mutation(async ({ input }) => {
			const result = await notificationService.sendNotification(
				NotificationTypes.BOOKING_DECLINED,
				{
					email: input.customerEmail,
					phone: input.customerPhone,
					name: input.customerName,
				},
				{
					customerName: input.customerName,
					serviceName: input.serviceName,
				},
				["email", "sms", "whatsapp"],
			);
			return result;
		}),

	/**
	 * Send booking cancellation notification
	 */
	sendBookingCancelled: protectedProcedure
		.input(
			z.object({
				recipientEmail: z.string().email().optional(),
				recipientPhone: z.string().optional(),
				recipientName: z.string(),
				serviceName: z.string(),
				date: z.string(),
			}),
		)
		.mutation(async ({ input }) => {
			const result = await notificationService.sendNotification(
				NotificationTypes.BOOKING_CANCELLED,
				{
					email: input.recipientEmail,
					phone: input.recipientPhone,
					name: input.recipientName,
				},
				{
					serviceName: input.serviceName,
					date: input.date,
				},
				["email", "sms", "whatsapp"],
			);
			return result;
		}),

	/**
	 * Send payment confirmation notification
	 */
	sendPaymentReceived: protectedProcedure
		.input(
			z.object({
				providerEmail: z.string().email().optional(),
				providerPhone: z.string().optional(),
				providerName: z.string(),
				serviceName: z.string(),
				amount: z.string(),
			}),
		)
		.mutation(async ({ input }) => {
			const result = await notificationService.sendNotification(
				NotificationTypes.PAYMENT_RECEIVED,
				{
					email: input.providerEmail,
					phone: input.providerPhone,
					name: input.providerName,
				},
				{
					serviceName: input.serviceName,
					amount: input.amount,
				},
				["email", "sms", "whatsapp"],
			);
			return result;
		}),

	/**
	 * Send payment released notification
	 */
	sendPaymentReleased: protectedProcedure
		.input(
			z.object({
				providerEmail: z.string().email().optional(),
				providerPhone: z.string().optional(),
				providerName: z.string(),
				serviceName: z.string(),
				amount: z.string(),
			}),
		)
		.mutation(async ({ input }) => {
			const result = await notificationService.sendNotification(
				NotificationTypes.PAYMENT_RELEASED,
				{
					email: input.providerEmail,
					phone: input.providerPhone,
					name: input.providerName,
				},
				{
					serviceName: input.serviceName,
					amount: input.amount,
				},
				["email", "sms", "whatsapp"],
			);
			return result;
		}),

	/**
	 * Send service completion notification
	 */
	sendServiceCompleted: protectedProcedure
		.input(
			z.object({
				customerEmail: z.string().email().optional(),
				customerPhone: z.string().optional(),
				customerName: z.string(),
				serviceName: z.string(),
			}),
		)
		.mutation(async ({ input }) => {
			const result = await notificationService.sendNotification(
				NotificationTypes.BOOKING_COMPLETED,
				{
					email: input.customerEmail,
					phone: input.customerPhone,
					name: input.customerName,
				},
				{
					serviceName: input.serviceName,
				},
				["email", "sms", "whatsapp"],
			);
			return result;
		}),

	/**
	 * Send welcome notification to new users
	 */
	sendWelcome: protectedProcedure
		.input(
			z.object({
				userEmail: z.string().email().optional(),
				userPhone: z.string().optional(),
				userName: z.string(),
			}),
		)
		.mutation(async ({ input }) => {
			const result = await notificationService.sendNotification(
				NotificationTypes.WELCOME,
				{
					email: input.userEmail,
					phone: input.userPhone,
					name: input.userName,
				},
				{
					name: input.userName,
				},
				["email"],
			);
			return result;
		}),

	/**
	 * Send review notification to provider
	 */
	sendServiceReviewed: protectedProcedure
		.input(
			z.object({
				providerEmail: z.string().email().optional(),
				providerPhone: z.string().optional(),
				providerName: z.string(),
				serviceName: z.string(),
				rating: z.number(),
				comment: z.string(),
			}),
		)
		.mutation(async ({ input }) => {
			const result = await notificationService.sendNotification(
				NotificationTypes.SERVICE_REVIEWED,
				{
					email: input.providerEmail,
					phone: input.providerPhone,
					name: input.providerName,
				},
				{
					serviceName: input.serviceName,
					rating: input.rating,
					comment: input.comment,
				},
				["email", "sms", "whatsapp"],
			);
			return result;
		}),

	/**
	 * Test notification service configuration
	 */
	testConfiguration: protectedProcedure.query(() => {
		return notificationService.getConfigurationStatus();
	}),

	/**
	 * Send test notification (for development/testing)
	 */
	sendTest: protectedProcedure
		.input(
			z.object({
				email: z.string().email().optional(),
				phone: z.string().optional(),
				type: z.enum(Object.values(NotificationTypes) as [string, ...string[]]),
				channels: z.array(z.enum(["sms", "whatsapp", "email"])).optional(),
			}),
		)
		.mutation(async ({ input, ctx }) => {
			const testData = {
				customerName: ctx.session.user.name || "Cliente Teste",
				serviceName: "Serviço de Teste",
				providerName: "Profissional Teste",
				date: new Date().toLocaleDateString("pt-BR"),
				time: "14:00",
				price: "150,00",
				amount: "150,00",
				address: "Endereço de Teste",
				rating: 5,
				comment: "Excelente serviço!",
				code: "123456",
			};

			const result = await notificationService.sendNotification(
				input.type,
				{
					email: input.email || ctx.session.user.email || undefined,
					phone: input.phone,
					name: ctx.session.user.name || "Usuário Teste",
				},
				testData,
				input.channels || ["email"],
			);
			return result;
		}),
});
