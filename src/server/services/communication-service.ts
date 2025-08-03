import type { Twilio } from "twilio";
import { env } from "~/env";

// Types for different communication channels
export interface EmailOptions {
	to: string | string[];
	from?: string;
	subject: string;
	text?: string;
	html?: string;
	templateId?: string;
	templateData?: Record<string, unknown>;
}

export interface SMSOptions {
	to: string;
	body: string;
	from?: string;
}

export interface WhatsAppOptions {
	to: string;
	body: string;
	templateName?: string;
	templateParams?: string[];
}

export interface NotificationTemplate {
	id: string;
	name: string;
	channels: ("email" | "sms" | "whatsapp")[];
	email?: {
		subject: string;
		html: string;
		text?: string;
	};
	sms?: {
		body: string;
	};
	whatsapp?: {
		templateName?: string;
		body: string;
	};
}

// Communication service class
export class CommunicationService {
	private twilioClient: Twilio | null = null;
	private emailProvider: "nodemailer" | "sendgrid" | "resend";

	constructor() {
		this.emailProvider = "nodemailer"; // Default to nodemailer for simplicity
		this.initializeTwilio();
	}

	private initializeTwilio() {
		// Initialize Twilio client when the service is instantiated
		// This will be done only if Twilio credentials are available
		if (env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN) {
			try {
				// Dynamically import Twilio to avoid issues if not installed
				import("twilio")
					.then((twilioModule) => {
						this.twilioClient = twilioModule.default(
							env.TWILIO_ACCOUNT_SID,
							env.TWILIO_AUTH_TOKEN,
						);
					})
					.catch((error) => {
						console.warn("Twilio not available:", error.message);
					});
			} catch (error) {
				console.warn("Failed to initialize Twilio:", error);
			}
		}
	}

	/**
	 * Send email notification
	 */
	async sendEmail(
		options: EmailOptions,
	): Promise<{ success: boolean; messageId?: string; error?: string }> {
		try {
			switch (this.emailProvider) {
				case "nodemailer":
					return await this.sendEmailWithNodemailer(options);
				case "sendgrid":
					return await this.sendEmailWithSendGrid(options);
				case "resend":
					return await this.sendEmailWithResend(options);
				default:
					throw new Error("No email provider configured");
			}
		} catch (error) {
			console.error("Email sending failed:", error);
			return {
				success: false,
				error: error instanceof Error ? error.message : "Unknown error",
			};
		}
	}

	/**
	 * Send SMS notification
	 */
	async sendSMS(
		options: SMSOptions,
	): Promise<{ success: boolean; messageId?: string; error?: string }> {
		if (!this.twilioClient) {
			return {
				success: false,
				error: "Twilio not configured",
			};
		}

		try {
			const message = await this.twilioClient.messages.create({
				body: options.body,
				from: options.from || env.TWILIO_PHONE_NUMBER,
				to: options.to,
			});

			return {
				success: true,
				messageId: message.sid,
			};
		} catch (error) {
			console.error("SMS sending failed:", error);
			return {
				success: false,
				error: error instanceof Error ? error.message : "Unknown error",
			};
		}
	}

	/**
	 * Send WhatsApp notification
	 */
	async sendWhatsApp(
		options: WhatsAppOptions,
	): Promise<{ success: boolean; messageId?: string; error?: string }> {
		if (!this.twilioClient) {
			return {
				success: false,
				error: "Twilio not configured",
			};
		}

		try {
			const messageOptions: {
				body?: string;
				from: string;
				to: string;
				contentSid?: string;
				contentVariables?: string;
			} = {
				body: options.body,
				from: `whatsapp:${env.TWILIO_WHATSAPP_NUMBER || env.TWILIO_PHONE_NUMBER}`,
				to: `whatsapp:${options.to}`,
			};

			// If using WhatsApp Business API templates
			if (options.templateName && options.templateParams) {
				messageOptions.contentSid = options.templateName;
				messageOptions.contentVariables = JSON.stringify(
					options.templateParams.reduce(
						(acc, param, index) => {
							acc[`${index + 1}`] = param;
							return acc;
						},
						{} as Record<string, string>,
					),
				);
				messageOptions.body = undefined;
			}

			const message = await this.twilioClient.messages.create(messageOptions);

			return {
				success: true,
				messageId: message.sid,
			};
		} catch (error) {
			console.error("WhatsApp sending failed:", error);
			return {
				success: false,
				error: error instanceof Error ? error.message : "Unknown error",
			};
		}
	}

	/**
	 * Send multi-channel notification using template
	 */
	async sendNotification(
		template: NotificationTemplate,
		recipient: {
			email?: string;
			phone?: string;
			whatsapp?: string;
			preferences?: {
				email?: boolean;
				sms?: boolean;
				whatsapp?: boolean;
			};
		},
		data: Record<string, unknown> = {},
	): Promise<{
		email?: { success: boolean; messageId?: string; error?: string };
		sms?: { success: boolean; messageId?: string; error?: string };
		whatsapp?: { success: boolean; messageId?: string; error?: string };
	}> {
		const results: Record<
			string,
			{ success: boolean; messageId?: string; error?: string }
		> = {};

		// Send email if enabled and email is provided
		if (
			template.channels.includes("email") &&
			recipient.email &&
			recipient.preferences?.email !== false &&
			template.email
		) {
			const emailContent = this.processTemplate(template.email.html, data);
			const emailSubject = this.processTemplate(template.email.subject, data);
			const emailText = template.email.text
				? this.processTemplate(template.email.text, data)
				: undefined;

			results.email = await this.sendEmail({
				to: recipient.email,
				subject: emailSubject,
				html: emailContent,
				text: emailText,
			});
		}

		// Send SMS if enabled and phone is provided
		if (
			template.channels.includes("sms") &&
			recipient.phone &&
			recipient.preferences?.sms !== false &&
			template.sms
		) {
			const smsContent = this.processTemplate(template.sms.body, data);

			results.sms = await this.sendSMS({
				to: recipient.phone,
				body: smsContent,
			});
		}

		// Send WhatsApp if enabled and WhatsApp number is provided
		if (
			template.channels.includes("whatsapp") &&
			recipient.whatsapp &&
			recipient.preferences?.whatsapp !== false &&
			template.whatsapp
		) {
			const whatsappContent = this.processTemplate(
				template.whatsapp.body,
				data,
			);

			results.whatsapp = await this.sendWhatsApp({
				to: recipient.whatsapp,
				body: whatsappContent,
				templateName: template.whatsapp.templateName,
			});
		}

		return results;
	}

	/**
	 * Process template with data substitution
	 */
	private processTemplate(
		template: string,
		data: Record<string, unknown>,
	): string {
		return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
			return data[key]?.toString() || match;
		});
	}

	/**
	 * Email provider implementations
	 */
	private async sendEmailWithNodemailer(options: EmailOptions) {
		// Implementation with nodemailer
		try {
			const nodemailer = await import("nodemailer");

			const transporter = nodemailer.createTransport({
				host: env.SMTP_HOST,
				port: Number(env.SMTP_PORT || 587),
				secure: env.SMTP_SECURE === "true",
				auth: {
					user: env.SMTP_USER,
					pass: env.SMTP_PASSWORD,
				},
			});

			const result = await transporter.sendMail({
				from: options.from || env.SMTP_FROM,
				to: Array.isArray(options.to) ? options.to.join(", ") : options.to,
				subject: options.subject,
				text: options.text,
				html: options.html,
			});

			return {
				success: true,
				messageId: result.messageId,
			};
		} catch (error) {
			console.error("Nodemailer not installed or configured:", error);
			throw new Error(
				"Nodemailer is not available. Please install 'nodemailer' package.",
			);
		}
	}

	private async sendEmailWithSendGrid(options: EmailOptions) {
		// Implementation with SendGrid
		try {
			const sgMail = await import("@sendgrid/mail");
			if (!env.SENDGRID_API_KEY)
				throw new Error("SENDGRID_API_KEY not configured");
			sgMail.default.setApiKey(env.SENDGRID_API_KEY);

			// Build content array with proper typing for SendGrid
			const content: Array<{ type: string; value: string }> = [];
			if (options.text) {
				content.push({ type: "text/plain", value: options.text });
			}
			if (options.html) {
				content.push({ type: "text/html", value: options.html });
			}

			// Ensure content has at least one element
			if (content.length === 0) {
				content.push({ type: "text/plain", value: options.subject });
			}

			// Cast to proper SendGrid type (non-empty array)
			const msg = {
				to: options.to,
				from: options.from || env.SENDGRID_FROM || "noreply@example.com",
				subject: options.subject,
				content: content as [
					{ type: string; value: string },
					...Array<{ type: string; value: string }>,
				],
			};

			const result = await sgMail.default.send(msg);
			return {
				success: true,
				messageId:
					Array.isArray(result) && result[0] && result[0].headers
						? (result[0].headers["x-message-id"] as string)
						: undefined,
			};
		} catch (error) {
			console.error("SendGrid not installed or configured:", error);
			throw new Error(
				"SendGrid is not available. Please install '@sendgrid/mail' package.",
			);
		}
	}

	private async sendEmailWithResend(options: EmailOptions) {
		// Implementation with Resend
		try {
			const { Resend } = await import("resend");
			const resend = new Resend(env.RESEND_API_KEY);

			const emailData = {
				from: options.from || env.RESEND_FROM || "noreply@example.com",
				to: Array.isArray(options.to) ? options.to : [options.to],
				subject: options.subject,
				...(options.html
					? { html: options.html }
					: options.text
						? { text: options.text }
						: { text: options.subject }),
			};

			const result = await resend.emails.send(emailData);

			if (result.error) {
				throw new Error(result.error.message);
			}

			return {
				success: true,
				messageId: result.data?.id,
			};
		} catch (error) {
			console.error("Resend not installed or configured:", error);
			throw new Error(
				"Resend is not available. Please install 'resend' package.",
			);
		}
	}
}

// Predefined notification templates
export const notificationTemplates: Record<string, NotificationTemplate> = {
	bookingConfirmation: {
		id: "booking_confirmation",
		name: "Booking Confirmation",
		channels: ["email", "sms", "whatsapp"],
		email: {
			subject: "Agendamento Confirmado - {{serviceName}}",
			html: `
				<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
					<h2 style="color: #4F46E5;">Agendamento Confirmado!</h2>
					<p>Olá <strong>{{customerName}}</strong>,</p>
					<p>Seu agendamento para <strong>{{serviceName}}</strong> foi confirmado!</p>
					
					<div style="background: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0;">
						<h3 style="margin-top: 0;">Detalhes do Agendamento</h3>
						<p><strong>Serviço:</strong> {{serviceName}}</p>
						<p><strong>Data:</strong> {{bookingDate}}</p>
						<p><strong>Horário:</strong> {{bookingTime}}</p>
						<p><strong>Profissional:</strong> {{providerName}}</p>
						<p><strong>Local:</strong> {{location}}</p>
						<p><strong>Valor:</strong> R$ {{price}}</p>
						<p><strong>Referência:</strong> {{referenceNumber}}</p>
					</div>
					
					<p>Para entrar em contato com o profissional ou cancelar o agendamento, acesse seu dashboard.</p>
					
					<p style="margin-top: 30px;">
						<strong>Equipe {{platformName}}</strong>
					</p>
				</div>
			`,
			text: "Agendamento confirmado para {{serviceName}} em {{bookingDate}} às {{bookingTime}}. Referência: {{referenceNumber}}",
		},
		sms: {
			body: "Agendamento confirmado! {{serviceName}} em {{bookingDate}} às {{bookingTime}} com {{providerName}}. Ref: {{referenceNumber}}",
		},
		whatsapp: {
			body: "🎉 Agendamento confirmado!\n\n📅 {{serviceName}}\n🕒 {{bookingDate}} às {{bookingTime}}\n👨‍💼 {{providerName}}\n📍 {{location}}\n💰 R$ {{price}}\n\n📋 Referência: {{referenceNumber}}",
		},
	},

	bookingReminder: {
		id: "booking_reminder",
		name: "Booking Reminder",
		channels: ["email", "sms", "whatsapp"],
		email: {
			subject: "Lembrete: {{serviceName}} amanhã",
			html: `
				<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
					<h2 style="color: #F59E0B;">Lembrete de Agendamento</h2>
					<p>Olá <strong>{{customerName}}</strong>,</p>
					<p>Este é um lembrete de que você tem um agendamento amanhã:</p>
					
					<div style="background: #FEF3C7; padding: 20px; border-radius: 8px; margin: 20px 0;">
						<p><strong>Serviço:</strong> {{serviceName}}</p>
						<p><strong>Data:</strong> {{bookingDate}}</p>
						<p><strong>Horário:</strong> {{bookingTime}}</p>
						<p><strong>Profissional:</strong> {{providerName}}</p>
						<p><strong>Local:</strong> {{location}}</p>
						<p><strong>Contato:</strong> {{providerPhone}}</p>
					</div>
					
					<p>Se precisar cancelar ou reagendar, faça-o com pelo menos 24 horas de antecedência.</p>
				</div>
			`,
		},
		sms: {
			body: "Lembrete: {{serviceName}} amanhã às {{bookingTime}} com {{providerName}} em {{location}}. Contato: {{providerPhone}}",
		},
		whatsapp: {
			body: "⏰ Lembrete!\n\nVocê tem um agendamento amanhã:\n📅 {{serviceName}}\n🕒 {{bookingTime}}\n👨‍💼 {{providerName}}\n📍 {{location}}\n📞 {{providerPhone}}",
		},
	},

	providerNewBooking: {
		id: "provider_new_booking",
		name: "New Booking for Provider",
		channels: ["email", "sms", "whatsapp"],
		email: {
			subject: "Novo Agendamento Recebido",
			html: `
				<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
					<h2 style="color: #10B981;">Novo Agendamento!</h2>
					<p>Olá <strong>{{providerName}}</strong>,</p>
					<p>Você recebeu um novo agendamento:</p>
					
					<div style="background: #ECFDF5; padding: 20px; border-radius: 8px; margin: 20px 0;">
						<p><strong>Cliente:</strong> {{customerName}}</p>
						<p><strong>Serviço:</strong> {{serviceName}}</p>
						<p><strong>Data:</strong> {{bookingDate}}</p>
						<p><strong>Horário:</strong> {{bookingTime}}</p>
						<p><strong>Local:</strong> {{location}}</p>
						<p><strong>Valor:</strong> R$ {{price}}</p>
					</div>
					
					<p><strong>Ação necessária:</strong> Acesse seu dashboard para aceitar ou recusar este agendamento.</p>
				</div>
			`,
		},
		sms: {
			body: "Novo agendamento! {{customerName}} solicitou {{serviceName}} para {{bookingDate}} às {{bookingTime}}. Acesse o dashboard para responder.",
		},
		whatsapp: {
			body: "🆕 Novo agendamento!\n\n👤 {{customerName}}\n📅 {{serviceName}}\n🕒 {{bookingDate}} às {{bookingTime}}\n📍 {{location}}\n💰 R$ {{price}}\n\n⚡ Acesse o dashboard para aceitar/recusar",
		},
	},
};

// Export singleton instance
export const communicationService = new CommunicationService();

// Export factory function for dependency injection
export function createCommunicationService() {
	return communicationService;
}
