import { z } from "zod";
import {
	createTRPCRouter,
	protectedProcedure,
	publicProcedure,
} from "~/server/api/trpc";
import {
	type EmailOptions,
	type SMSOptions,
	type WhatsAppOptions,
	communicationService,
	notificationTemplates,
} from "~/server/services/communication-service";

// Input schemas
const sendEmailSchema = z.object({
	to: z.union([z.string().email(), z.array(z.string().email())]),
	subject: z.string().min(1).max(200),
	text: z.string().optional(),
	html: z.string().optional(),
	from: z.string().email().optional(),
});

const sendSMSSchema = z.object({
	to: z.string().min(10), // Phone number validation
	body: z.string().min(1).max(1600), // SMS character limit
	from: z.string().optional(),
});

const sendWhatsAppSchema = z.object({
	to: z.string().min(10), // Phone number validation
	body: z.string().min(1).max(4096), // WhatsApp message limit
	templateName: z.string().optional(),
	templateParams: z.array(z.string()).optional(),
});

const sendNotificationSchema = z.object({
	templateId: z.string(),
	recipient: z.object({
		email: z.string().email().optional(),
		phone: z.string().optional(),
		whatsapp: z.string().optional(),
		preferences: z
			.object({
				email: z.boolean().optional(),
				sms: z.boolean().optional(),
				whatsapp: z.boolean().optional(),
			})
			.optional(),
	}),
	data: z.record(z.any()).optional(),
});

const testConnectionSchema = z.object({
	service: z.enum(["email", "sms", "whatsapp"]),
});

export const communicationRouter = createTRPCRouter({
	/**
	 * Send email notification
	 */
	sendEmail: protectedProcedure
		.input(sendEmailSchema)
		.mutation(async ({ input }) => {
			const result = await communicationService.sendEmail(
				input as EmailOptions,
			);
			return result;
		}),

	/**
	 * Send SMS notification
	 */
	sendSMS: protectedProcedure
		.input(sendSMSSchema)
		.mutation(async ({ input }) => {
			const result = await communicationService.sendSMS(input as SMSOptions);
			return result;
		}),

	/**
	 * Send WhatsApp notification
	 */
	sendWhatsApp: protectedProcedure
		.input(sendWhatsAppSchema)
		.mutation(async ({ input }) => {
			const result = await communicationService.sendWhatsApp(
				input as WhatsAppOptions,
			);
			return result;
		}),

	/**
	 * Send multi-channel notification using template
	 */
	sendNotification: protectedProcedure
		.input(sendNotificationSchema)
		.mutation(async ({ input }) => {
			const template = notificationTemplates[input.templateId];
			if (!template) {
				throw new Error(`Template ${input.templateId} not found`);
			}

			const result = await communicationService.sendNotification(
				template,
				input.recipient,
				input.data || {},
			);

			return result;
		}),

	/**
	 * Get available notification templates
	 */
	getTemplates: protectedProcedure.query(() => {
		return Object.values(notificationTemplates).map((template) => ({
			id: template.id,
			name: template.name,
			channels: template.channels,
		}));
	}),

	/**
	 * Test communication service connections
	 */
	testConnection: protectedProcedure
		.input(testConnectionSchema)
		.mutation(async ({ input, ctx }) => {
			const testEmail = ctx.session.user.email;
			const testPhone = "+5511999999999"; // Example test number

			try {
				switch (input.service) {
					case "email": {
						if (!testEmail) {
							throw new Error("No email address available for testing");
						}

						const emailResult = await communicationService.sendEmail({
							to: testEmail,
							subject: "Teste de Conexão - Email",
							text: "Este é um teste de conexão do serviço de email.",
							html: "<p>Este é um <strong>teste de conexão</strong> do serviço de email.</p>",
						});

						return {
							success: emailResult.success,
							message: emailResult.success
								? "Email de teste enviado com sucesso"
								: `Erro ao enviar email: ${emailResult.error}`,
							details: emailResult,
						};
					}

					case "sms": {
						const smsResult = await communicationService.sendSMS({
							to: testPhone,
							body: "Teste de conexão SMS - Serviços Marketplace",
						});

						return {
							success: smsResult.success,
							message: smsResult.success
								? "SMS de teste enviado com sucesso"
								: `Erro ao enviar SMS: ${smsResult.error}`,
							details: smsResult,
						};
					}

					case "whatsapp": {
						const whatsappResult = await communicationService.sendWhatsApp({
							to: testPhone,
							body: "🧪 Teste de conexão WhatsApp - Serviços Marketplace",
						});

						return {
							success: whatsappResult.success,
							message: whatsappResult.success
								? "WhatsApp de teste enviado com sucesso"
								: `Erro ao enviar WhatsApp: ${whatsappResult.error}`,
							details: whatsappResult,
						};
					}

					default:
						throw new Error("Serviço não suportado");
				}
			} catch (error) {
				return {
					success: false,
					message: `Erro ao testar conexão: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
					details: {
						error: error instanceof Error ? error.message : "Unknown error",
					},
				};
			}
		}),

	/**
	 * Get communication service status
	 */
	getServiceStatus: protectedProcedure.query(() => {
		const status = {
			email: {
				configured: !!(
					process.env.SMTP_HOST ||
					process.env.SENDGRID_API_KEY ||
					process.env.RESEND_API_KEY
				),
				provider: process.env.SENDGRID_API_KEY
					? "SendGrid"
					: process.env.RESEND_API_KEY
						? "Resend"
						: process.env.SMTP_HOST
							? "SMTP"
							: "None",
			},
			sms: {
				configured: !!(
					process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
				),
				provider: process.env.TWILIO_ACCOUNT_SID ? "Twilio" : "None",
			},
			whatsapp: {
				configured: !!(
					process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
				),
				provider: process.env.TWILIO_ACCOUNT_SID ? "Twilio" : "None",
			},
		};

		return status;
	}),

	/**
	 * Send booking confirmation notification
	 */
	sendBookingConfirmation: protectedProcedure
		.input(
			z.object({
				bookingId: z.string().cuid(),
				customerEmail: z.string().email().optional(),
				customerPhone: z.string().optional(),
				customerWhatsapp: z.string().optional(),
				customerName: z.string(),
				serviceName: z.string(),
				bookingDate: z.string(),
				bookingTime: z.string(),
				providerName: z.string(),
				location: z.string(),
				price: z.string(),
				referenceNumber: z.string(),
				platformName: z.string().default("Serviços Marketplace"),
			}),
		)
		.mutation(async ({ input }) => {
			const {
				customerEmail,
				customerPhone,
				customerWhatsapp,
				...templateData
			} = input;

			const template = notificationTemplates.bookingConfirmation;
			if (!template) {
				throw new Error("Booking confirmation template not found");
			}

			const result = await communicationService.sendNotification(
				template,
				{
					email: customerEmail,
					phone: customerPhone,
					whatsapp: customerWhatsapp,
				},
				templateData,
			);

			return result;
		}),

	/**
	 * Send booking reminder notification
	 */
	sendBookingReminder: protectedProcedure
		.input(
			z.object({
				bookingId: z.string().cuid(),
				customerEmail: z.string().email().optional(),
				customerPhone: z.string().optional(),
				customerWhatsapp: z.string().optional(),
				customerName: z.string(),
				serviceName: z.string(),
				bookingDate: z.string(),
				bookingTime: z.string(),
				providerName: z.string(),
				providerPhone: z.string().optional(),
				location: z.string(),
			}),
		)
		.mutation(async ({ input }) => {
			const {
				customerEmail,
				customerPhone,
				customerWhatsapp,
				...templateData
			} = input;

			const template = notificationTemplates.bookingReminder;
			if (!template) {
				throw new Error("Booking reminder template not found");
			}

			const result = await communicationService.sendNotification(
				template,
				{
					email: customerEmail,
					phone: customerPhone,
					whatsapp: customerWhatsapp,
				},
				templateData,
			);

			return result;
		}),

	/**
	 * Notify provider of new booking
	 */
	notifyProviderNewBooking: protectedProcedure
		.input(
			z.object({
				bookingId: z.string().cuid(),
				providerEmail: z.string().email().optional(),
				providerPhone: z.string().optional(),
				providerWhatsapp: z.string().optional(),
				providerName: z.string(),
				customerName: z.string(),
				serviceName: z.string(),
				bookingDate: z.string(),
				bookingTime: z.string(),
				location: z.string(),
				price: z.string(),
			}),
		)
		.mutation(async ({ input }) => {
			const {
				providerEmail,
				providerPhone,
				providerWhatsapp,
				...templateData
			} = input;

			const template = notificationTemplates.providerNewBooking;
			if (!template) {
				throw new Error("Provider new booking template not found");
			}

			const result = await communicationService.sendNotification(
				template,
				{
					email: providerEmail,
					phone: providerPhone,
					whatsapp: providerWhatsapp,
				},
				templateData,
			);

			return result;
		}),
});
