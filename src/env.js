import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
	/**
	 * Specify your server-side environment variables schema here. This way you can ensure the app
	 * isn't built with invalid env vars.
	 */
	server: {
		AUTH_SECRET:
			process.env.NODE_ENV === "production"
				? z.string()
				: z.string().optional(),
		AUTH_GOOGLE_ID: z.string(),
		AUTH_GOOGLE_SECRET: z.string(),
		DATABASE_URL: z.string().url(),
		NODE_ENV: z
			.enum(["development", "test", "production"])
			.default("development"),
		PAGARME_SECRET_KEY: z.string(),
		PAGARME_PUBLIC_KEY: z.string().optional(),
		CLOUDINARY_CLOUD_NAME: z.string(),
		CLOUDINARY_API_KEY: z.string(),
		CLOUDINARY_API_SECRET: z.string(),

		// Twilio Configuration (optional)
		TWILIO_ACCOUNT_SID: z.string().optional(),
		TWILIO_AUTH_TOKEN: z.string().optional(),
		TWILIO_PHONE_NUMBER: z.string().optional(),
		TWILIO_WHATSAPP_NUMBER: z.string().optional(),

		// Email Configuration (optional - choose one provider)
		// Nodemailer/SMTP
		SMTP_HOST: z.string().optional(),
		SMTP_PORT: z.string().optional(),
		SMTP_SECURE: z.string().optional(),
		SMTP_USER: z.string().optional(),
		SMTP_PASSWORD: z.string().optional(),
		SMTP_FROM: z.string().optional(),

		// SendGrid
		SENDGRID_API_KEY: z.string().optional(),
		SENDGRID_FROM: z.string().optional(),

		// Resend
		RESEND_API_KEY: z.string().optional(),
		RESEND_FROM: z.string().optional(),
	},

	/**
	 * Specify your client-side environment variables schema here. This way you can ensure the app
	 * isn't built with invalid env vars. To expose them to the client, prefix them with
	 * `NEXT_PUBLIC_`.
	 */
	client: {
		// NEXT_PUBLIC_CLIENTVAR: z.string(),
	},

	/**
	 * You can't destruct `process.env` as a regular object in the Next.js edge runtimes (e.g.
	 * middlewares) or client-side so we need to destruct manually.
	 */
	runtimeEnv: {
		AUTH_SECRET: process.env.AUTH_SECRET,
		AUTH_GOOGLE_ID: process.env.AUTH_GOOGLE_ID,
		AUTH_GOOGLE_SECRET: process.env.AUTH_GOOGLE_SECRET,
		DATABASE_URL: process.env.DATABASE_URL,
		NODE_ENV: process.env.NODE_ENV,
		PAGARME_SECRET_KEY: process.env.PAGARME_SECRET_KEY,
		PAGARME_PUBLIC_KEY: process.env.PAGARME_PUBLIC_KEY,
		CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
		CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
		CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,

		// Twilio
		TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
		TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
		TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER,
		TWILIO_WHATSAPP_NUMBER: process.env.TWILIO_WHATSAPP_NUMBER,

		// Email providers
		SMTP_HOST: process.env.SMTP_HOST,
		SMTP_PORT: process.env.SMTP_PORT,
		SMTP_SECURE: process.env.SMTP_SECURE,
		SMTP_USER: process.env.SMTP_USER,
		SMTP_PASSWORD: process.env.SMTP_PASSWORD,
		SMTP_FROM: process.env.SMTP_FROM,
		SENDGRID_API_KEY: process.env.SENDGRID_API_KEY,
		SENDGRID_FROM: process.env.SENDGRID_FROM,
		RESEND_API_KEY: process.env.RESEND_API_KEY,
		RESEND_FROM: process.env.RESEND_FROM,
	},
	/**
	 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially
	 * useful for Docker builds.
	 */
	skipValidation: !!process.env.SKIP_ENV_VALIDATION,
	/**
	 * Makes it so that empty strings are treated as undefined. `SOME_VAR: z.string()` and
	 * `SOME_VAR=''` will throw an error.
	 */
	emptyStringAsUndefined: true,
});
