import sgMail from "@sendgrid/mail";
import twilio from "twilio";
import { z } from "zod";
import { env } from "~/env";

// Notification types and templates
export interface NotificationTemplate {
	sms?: string;
	whatsapp?: string;
	email?: {
		subject: string;
		html: string;
		text: string;
	};
}

export interface NotificationRecipient {
	phone?: string;
	email?: string;
	name?: string;
}

export interface NotificationData {
	[key: string]: string | number | boolean | undefined;
}

// Available notification types for the marketplace
export const NotificationTypes = {
	// Booking notifications
	BOOKING_CREATED: "booking_created",
	BOOKING_ACCEPTED: "booking_accepted",
	BOOKING_DECLINED: "booking_declined",
	BOOKING_CANCELLED: "booking_cancelled",
	BOOKING_REMINDER: "booking_reminder",
	BOOKING_COMPLETED: "booking_completed",

	// Payment notifications
	PAYMENT_RECEIVED: "payment_received",
	PAYMENT_RELEASED: "payment_released",
	PAYMENT_FAILED: "payment_failed",

	// Service notifications
	SERVICE_REVIEWED: "service_reviewed",
	SERVICE_INQUIRY: "service_inquiry",

	// System notifications
	WELCOME: "welcome",
	PROFILE_VERIFIED: "profile_verified",
	PASSWORD_RESET: "password_reset",
} as const;

export type NotificationType =
	(typeof NotificationTypes)[keyof typeof NotificationTypes];

// Notification templates
const TEMPLATES: Record<NotificationType, NotificationTemplate> = {
	booking_created: {
		sms: "Nova reserva recebida para {{serviceName}} em {{date}}. Acesse seu painel para responder.",
		whatsapp:
			"🔔 *Nova Reserva!*\n\nVocê recebeu uma nova reserva para:\n*{{serviceName}}*\n\n📅 Data: {{date}}\n💰 Valor: R$ {{price}}\n\nAcesse seu painel para aceitar ou recusar.",
		email: {
			subject: "Nova reserva recebida - {{serviceName}}",
			html: `
        <h2>Nova Reserva Recebida</h2>
        <p>Olá {{providerName}},</p>
        <p>Você recebeu uma nova reserva para o serviço <strong>{{serviceName}}</strong>.</p>
        <ul>
          <li><strong>Cliente:</strong> {{customerName}}</li>
          <li><strong>Data:</strong> {{date}}</li>
          <li><strong>Valor:</strong> R$ {{price}}</li>
        </ul>
        <p>Acesse seu painel para aceitar ou recusar esta reserva.</p>
      `,
			text: "Nova reserva para {{serviceName}} de {{customerName}} em {{date}}. Valor: R$ {{price}}. Acesse seu painel para responder.",
		},
	},

	booking_accepted: {
		sms: "Sua reserva para {{serviceName}} foi aceita! Data: {{date}}.",
		whatsapp:
			"✅ *Reserva Aceita!*\n\nSua reserva foi aceita:\n*{{serviceName}}*\n\n📅 {{date}}\n🏠 {{address}}\n\nO profissional entrará em contato em breve.",
		email: {
			subject: "Reserva aceita - {{serviceName}}",
			html: `
        <h2>Reserva Aceita</h2>
        <p>Olá {{customerName}},</p>
        <p>Sua reserva para <strong>{{serviceName}}</strong> foi aceita!</p>
        <ul>
          <li><strong>Profissional:</strong> {{providerName}}</li>
          <li><strong>Data:</strong> {{date}}</li>
          <li><strong>Endereço:</strong> {{address}}</li>
        </ul>
        <p>O profissional entrará em contato em breve.</p>
      `,
			text: "Sua reserva para {{serviceName}} foi aceita. Data: {{date}}. O profissional {{providerName}} entrará em contato.",
		},
	},

	booking_declined: {
		sms: "Sua reserva para {{serviceName}} foi recusada. Procure outros profissionais disponíveis.",
		whatsapp:
			"❌ *Reserva Recusada*\n\nInfelizmente sua reserva para *{{serviceName}}* foi recusada.\n\nNão se preocupe! Você pode procurar outros profissionais disponíveis.",
		email: {
			subject: "Reserva recusada - {{serviceName}}",
			html: `
        <h2>Reserva Recusada</h2>
        <p>Olá {{customerName}},</p>
        <p>Infelizmente sua reserva para <strong>{{serviceName}}</strong> foi recusada.</p>
        <p>Não se preocupe! Você pode procurar outros profissionais disponíveis em nossa plataforma.</p>
      `,
			text: "Sua reserva para {{serviceName}} foi recusada. Procure outros profissionais disponíveis.",
		},
	},

	booking_cancelled: {
		sms: "Reserva cancelada: {{serviceName}} em {{date}}.",
		whatsapp:
			"🚫 *Reserva Cancelada*\n\nA reserva para *{{serviceName}}* foi cancelada.\n\n📅 Data: {{date}}\n\nSe você cancelou por engano, pode fazer uma nova reserva.",
		email: {
			subject: "Reserva cancelada - {{serviceName}}",
			html: `
        <h2>Reserva Cancelada</h2>
        <p>A reserva para <strong>{{serviceName}}</strong> foi cancelada.</p>
        <p>Data: {{date}}</p>
        <p>Se você cancelou por engano, pode fazer uma nova reserva a qualquer momento.</p>
      `,
			text: "Reserva cancelada: {{serviceName}} em {{date}}.",
		},
	},

	booking_reminder: {
		sms: "Lembrete: Você tem um agendamento para {{serviceName}} amanhã às {{time}}.",
		whatsapp:
			"⏰ *Lembrete de Agendamento*\n\nVocê tem um agendamento amanhã:\n*{{serviceName}}*\n\n🕐 Horário: {{time}}\n📍 Local: {{address}}",
		email: {
			subject: "Lembrete de agendamento - {{serviceName}}",
			html: `
        <h2>Lembrete de Agendamento</h2>
        <p>Você tem um agendamento amanhã:</p>
        <ul>
          <li><strong>Serviço:</strong> {{serviceName}}</li>
          <li><strong>Horário:</strong> {{time}}</li>
          <li><strong>Local:</strong> {{address}}</li>
        </ul>
      `,
			text: "Lembrete: {{serviceName}} amanhã às {{time}} em {{address}}.",
		},
	},

	booking_completed: {
		sms: "Serviço {{serviceName}} concluído! Avalie o profissional.",
		whatsapp:
			"✨ *Serviço Concluído!*\n\nO serviço *{{serviceName}}* foi marcado como concluído.\n\n⭐ Que tal avaliar o profissional?",
		email: {
			subject: "Serviço concluído - {{serviceName}}",
			html: `
        <h2>Serviço Concluído</h2>
        <p>O serviço <strong>{{serviceName}}</strong> foi marcado como concluído.</p>
        <p>Que tal avaliar o profissional e compartilhar sua experiência?</p>
      `,
			text: "Serviço {{serviceName}} concluído! Avalie o profissional.",
		},
	},

	payment_received: {
		sms: "Pagamento de R$ {{amount}} recebido para {{serviceName}}.",
		whatsapp:
			"💰 *Pagamento Recebido*\n\nR$ {{amount}} recebido para:\n*{{serviceName}}*\n\nO valor será liberado após a conclusão do serviço.",
		email: {
			subject: "Pagamento recebido - R$ {{amount}}",
			html: `
        <h2>Pagamento Recebido</h2>
        <p>Recebemos o pagamento de <strong>R$ {{amount}}</strong> para o serviço {{serviceName}}.</p>
        <p>O valor será liberado em sua conta após a conclusão do serviço.</p>
      `,
			text: "Pagamento de R$ {{amount}} recebido para {{serviceName}}.",
		},
	},

	payment_released: {
		sms: "Pagamento de R$ {{amount}} liberado em sua conta!",
		whatsapp:
			"🎉 *Pagamento Liberado!*\n\nR$ {{amount}} foi liberado em sua conta.\n\nServiço: {{serviceName}}",
		email: {
			subject: "Pagamento liberado - R$ {{amount}}",
			html: `
        <h2>Pagamento Liberado</h2>
        <p>O pagamento de <strong>R$ {{amount}}</strong> foi liberado em sua conta.</p>
        <p>Serviço: {{serviceName}}</p>
      `,
			text: "Pagamento de R$ {{amount}} liberado para {{serviceName}}.",
		},
	},

	payment_failed: {
		sms: "Falha no pagamento para {{serviceName}}. Tente novamente.",
		whatsapp:
			"❌ *Falha no Pagamento*\n\nO pagamento para *{{serviceName}}* falhou.\n\nTente novamente ou use outro método de pagamento.",
		email: {
			subject: "Falha no pagamento - {{serviceName}}",
			html: `
        <h2>Falha no Pagamento</h2>
        <p>O pagamento para <strong>{{serviceName}}</strong> não pôde ser processado.</p>
        <p>Tente novamente ou use outro método de pagamento.</p>
      `,
			text: "Falha no pagamento para {{serviceName}}. Tente novamente.",
		},
	},

	service_reviewed: {
		sms: "Você recebeu uma nova avaliação ({{rating}} estrelas)!",
		whatsapp:
			'⭐ *Nova Avaliação!*\n\nVocê recebeu {{rating}} estrelas!\n\nServiço: *{{serviceName}}*\n\n"{{comment}}"',
		email: {
			subject: "Nova avaliação recebida - {{rating}} estrelas",
			html: `
        <h2>Nova Avaliação</h2>
        <p>Você recebeu uma nova avaliação de <strong>{{rating}} estrelas</strong>!</p>
        <p>Serviço: {{serviceName}}</p>
        <p>Comentário: "{{comment}}"</p>
      `,
			text: "Nova avaliação: {{rating}} estrelas para {{serviceName}}. Comentário: {{comment}}",
		},
	},

	service_inquiry: {
		sms: "Nova pergunta sobre {{serviceName}} de {{customerName}}.",
		whatsapp:
			'❓ *Nova Pergunta*\n\n{{customerName}} fez uma pergunta sobre:\n*{{serviceName}}*\n\n"{{message}}"',
		email: {
			subject: "Nova pergunta sobre {{serviceName}}",
			html: `
        <h2>Nova Pergunta</h2>
        <p><strong>{{customerName}}</strong> fez uma pergunta sobre {{serviceName}}:</p>
        <blockquote>"{{message}}"</blockquote>
        <p>Responda rapidamente para aumentar suas chances de conversão!</p>
      `,
			text: "{{customerName}} perguntou sobre {{serviceName}}: {{message}}",
		},
	},

	welcome: {
		sms: "Bem-vindo à nossa plataforma! Complete seu perfil para começar.",
		whatsapp:
			"🎉 *Bem-vindo!*\n\nSua conta foi criada com sucesso!\n\nComplete seu perfil para começar a usar nossa plataforma.",
		email: {
			subject: "Bem-vindo à nossa plataforma!",
			html: `
        <h2>Bem-vindo!</h2>
        <p>Sua conta foi criada com sucesso!</p>
        <p>Complete seu perfil para começar a usar nossa plataforma e encontrar os melhores profissionais.</p>
      `,
			text: "Bem-vindo! Complete seu perfil para começar a usar nossa plataforma.",
		},
	},

	profile_verified: {
		sms: "Perfil verificado com sucesso! Agora você pode oferecer seus serviços.",
		whatsapp:
			"✅ *Perfil Verificado!*\n\nSeu perfil foi verificado com sucesso!\n\nAgora você pode começar a oferecer seus serviços.",
		email: {
			subject: "Perfil verificado com sucesso",
			html: `
        <h2>Perfil Verificado</h2>
        <p>Parabéns! Seu perfil foi verificado com sucesso.</p>
        <p>Agora você pode começar a oferecer seus serviços em nossa plataforma.</p>
      `,
			text: "Perfil verificado! Agora você pode oferecer seus serviços.",
		},
	},

	password_reset: {
		sms: "Código de recuperação: {{code}}. Use-o para redefinir sua senha.",
		whatsapp:
			"🔐 *Recuperação de Senha*\n\nSeu código de recuperação: *{{code}}*\n\nUse este código para redefinir sua senha.",
		email: {
			subject: "Recuperação de senha",
			html: `
        <h2>Recuperação de Senha</h2>
        <p>Seu código de recuperação: <strong>{{code}}</strong></p>
        <p>Use este código para redefinir sua senha.</p>
        <p>Se você não solicitou esta recuperação, ignore este email.</p>
      `,
			text: "Código de recuperação: {{code}}. Use-o para redefinir sua senha.",
		},
	},
};

export class NotificationService {
	private twilioClient: twilio.Twilio | null = null;

	constructor() {
		// Initialize Twilio client if credentials are available
		if (env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN) {
			this.twilioClient = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
		}

		// Initialize SendGrid if API key is available
		if (env.SENDGRID_API_KEY) {
			sgMail.setApiKey(env.SENDGRID_API_KEY);
		}
	}

	/**
	 * Send notification via multiple channels
	 */
	async sendNotification(
		type: NotificationType,
		recipient: NotificationRecipient,
		data: NotificationData = {},
		channels: ("sms" | "whatsapp" | "email")[] = ["sms", "email"],
	): Promise<{
		success: boolean;
		results: {
			channel: string;
			success: boolean;
			messageId?: string;
			error?: string;
		}[];
	}> {
		const template = TEMPLATES[type];
		const results: {
			channel: string;
			success: boolean;
			messageId?: string;
			error?: string;
		}[] = [];

		// Send SMS
		if (channels.includes("sms") && template.sms && recipient.phone) {
			try {
				const message = this.replaceTemplateVariables(template.sms, data);
				const result = await this.sendSMS(recipient.phone, message);
				results.push({
					channel: "sms",
					success: true,
					messageId: result.messageId,
				});
			} catch (error) {
				results.push({
					channel: "sms",
					success: false,
					error: (error as Error).message,
				});
			}
		}

		// Send WhatsApp
		if (channels.includes("whatsapp") && template.whatsapp && recipient.phone) {
			try {
				const message = this.replaceTemplateVariables(template.whatsapp, data);
				const result = await this.sendWhatsApp(recipient.phone, message);
				results.push({
					channel: "whatsapp",
					success: true,
					messageId: result.messageId,
				});
			} catch (error) {
				results.push({
					channel: "whatsapp",
					success: false,
					error: (error as Error).message,
				});
			}
		}

		// Send Email
		if (channels.includes("email") && template.email && recipient.email) {
			try {
				const emailData = {
					subject: this.replaceTemplateVariables(template.email.subject, data),
					html: this.replaceTemplateVariables(template.email.html, data),
					text: this.replaceTemplateVariables(template.email.text, data),
				};
				const result = await this.sendEmail(
					recipient.email,
					emailData.subject,
					emailData.html,
					emailData.text,
				);
				results.push({
					channel: "email",
					success: true,
					messageId: result.messageId,
				});
			} catch (error) {
				results.push({
					channel: "email",
					success: false,
					error: (error as Error).message,
				});
			}
		}

		const success = results.some((r) => r.success);
		return { success, results };
	}

	/**
	 * Send SMS via Twilio
	 */
	async sendSMS(to: string, message: string): Promise<{ messageId: string }> {
		if (!this.twilioClient || !env.TWILIO_PHONE_NUMBER) {
			throw new Error("Twilio not configured for SMS");
		}

		const result = await this.twilioClient.messages.create({
			body: message,
			from: env.TWILIO_PHONE_NUMBER,
			to: to,
		});

		return { messageId: result.sid };
	}

	/**
	 * Send WhatsApp message via Twilio
	 */
	async sendWhatsApp(
		to: string,
		message: string,
	): Promise<{ messageId: string }> {
		if (!this.twilioClient || !env.TWILIO_WHATSAPP_NUMBER) {
			throw new Error("Twilio not configured for WhatsApp");
		}

		const result = await this.twilioClient.messages.create({
			body: message,
			from: `whatsapp:${env.TWILIO_WHATSAPP_NUMBER}`,
			to: `whatsapp:${to}`,
		});

		return { messageId: result.sid };
	}

	/**
	 * Send email (supports multiple providers)
	 */
	async sendEmail(
		to: string,
		subject: string,
		html: string,
		text: string,
	): Promise<{ messageId: string }> {
		// Try SendGrid first
		if (env.SENDGRID_API_KEY && env.SENDGRID_FROM) {
			return await this.sendEmailViaSendGrid(to, subject, html, text);
		}

		// Try Resend
		if (env.RESEND_API_KEY && env.RESEND_FROM) {
			return await this.sendEmailViaResend(to, subject, html, text);
		}

		// Try SMTP
		if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASSWORD && env.SMTP_FROM) {
			return await this.sendEmailViaSMTP(to, subject, html, text);
		}

		throw new Error("No email provider configured");
	}

	/**
	 * Send email via SendGrid
	 */
	private async sendEmailViaSendGrid(
		to: string,
		subject: string,
		html: string,
		text: string,
	): Promise<{ messageId: string }> {
		if (!env.SENDGRID_API_KEY || !env.SENDGRID_FROM) {
			throw new Error("SendGrid not configured");
		}

		const msg = {
			to,
			from: env.SENDGRID_FROM,
			subject,
			text,
			html,
		};

		const response = await sgMail.send(msg);

		// SendGrid returns an array with response data
		const messageId = response[0]?.headers?.["x-message-id"] || "sendgrid-sent";

		return { messageId: String(messageId) };
	}

	/**
	 * Send email via Resend
	 */
	private async sendEmailViaResend(
		to: string,
		subject: string,
		html: string,
		text: string,
	): Promise<{ messageId: string }> {
		const response = await fetch("https://api.resend.com/emails", {
			method: "POST",
			headers: {
				Authorization: `Bearer ${env.RESEND_API_KEY}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				from: env.RESEND_FROM,
				to: [to],
				subject,
				html,
				text,
			}),
		});

		if (!response.ok) {
			throw new Error(`Resend error: ${response.statusText}`);
		}

		const data = (await response.json()) as { id: string };
		return { messageId: data.id };
	}

	/**
	 * Send email via SMTP (using built-in Node.js modules)
	 */
	private async sendEmailViaSMTP(
		to: string,
		subject: string,
		html: string,
		text: string,
	): Promise<{ messageId: string }> {
		// For SMTP, we'd need to install nodemailer
		// For now, just throw an error indicating it needs implementation
		throw new Error(
			"SMTP email sending requires nodemailer package - install with: npm install nodemailer @types/nodemailer",
		);
	}

	/**
	 * Replace template variables with actual data
	 */
	private replaceTemplateVariables(
		template: string,
		data: NotificationData,
	): string {
		return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
			const value = data[key];
			return value !== undefined ? String(value) : match;
		});
	}

	/**
	 * Validate phone number format
	 */
	validatePhoneNumber(phone: string): boolean {
		// Basic validation - should start with + and country code
		return /^\+\d{10,15}$/.test(phone);
	}

	/**
	 * Validate email format
	 */
	validateEmail(email: string): boolean {
		return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
	}

	/**
	 * Check if service is properly configured
	 */
	getConfigurationStatus(): {
		sms: boolean;
		whatsapp: boolean;
		email: {
			sendgrid: boolean;
			resend: boolean;
			smtp: boolean;
		};
	} {
		return {
			sms: !!(this.twilioClient && env.TWILIO_PHONE_NUMBER),
			whatsapp: !!(this.twilioClient && env.TWILIO_WHATSAPP_NUMBER),
			email: {
				sendgrid: !!(env.SENDGRID_API_KEY && env.SENDGRID_FROM),
				resend: !!(env.RESEND_API_KEY && env.RESEND_FROM),
				smtp: !!(
					env.SMTP_HOST &&
					env.SMTP_USER &&
					env.SMTP_PASSWORD &&
					env.SMTP_FROM
				),
			},
		};
	}
}

// Create singleton instance
export const notificationService = new NotificationService();

// Export utility functions
export function createNotificationService(): NotificationService {
	return new NotificationService();
}

// Input validation schemas
export const sendNotificationSchema = z.object({
	type: z.enum(Object.values(NotificationTypes) as [string, ...string[]]),
	recipient: z.object({
		phone: z.string().optional(),
		email: z.string().email().optional(),
		name: z.string().optional(),
	}),
	data: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
	channels: z.array(z.enum(["sms", "whatsapp", "email"])).optional(),
});

export type SendNotificationInput = z.infer<typeof sendNotificationSchema>;
