import { PrismaAdapter } from "@auth/prisma-adapter";
import type { DefaultSession, NextAuthConfig } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

import { db } from "~/server/db";

/**
 * Module augmentation for `next-auth` types. Allows us to add custom properties to the `session`
 * object and keep type safety.
 *
 * @see https://next-auth.js.org/getting-started/typescript#module-augmentation
 */
declare module "next-auth" {
	interface Session extends DefaultSession {
		user: {
			id: string;
			isProfessional: boolean;
			phone?: string | null;
		} & DefaultSession["user"];
		accessToken?: string;
	}

	interface User {
		isProfessional: boolean;
		phone?: string | null;
	}
}

declare module "@auth/core/adapters" {
	interface AdapterUser {
		isProfessional: boolean;
		phone?: string | null;
	}
}

/**
 * Options for NextAuth.js used to configure adapters, providers, callbacks, etc.
 *
 * @see https://next-auth.js.org/configuration/options
 */
export const authConfig = {
	providers: [
		GoogleProvider({
			clientId: process.env.AUTH_GOOGLE_ID ?? "",
			clientSecret: process.env.AUTH_GOOGLE_SECRET ?? "",
			authorization: {
				params: {
					prompt: "consent",
					access_type: "offline",
					response_type: "code",
				},
			},
		}),
	],
	adapter: PrismaAdapter(db),
	session: {
		strategy: "database",
		maxAge: 7 * 24 * 60 * 60, // 7 days as requested
		updateAge: 24 * 60 * 60, // 24 hours - updates session on activity
		generateSessionToken: () => {
			// Generate cryptographically secure session tokens
			return crypto.randomUUID();
		},
	},
	cookies: {
		sessionToken: {
			name: "next-auth.session-token",
			options: {
				httpOnly: true,
				sameSite: "lax",
				path: "/",
				secure: process.env.NODE_ENV === "production",
				maxAge: 7 * 24 * 60 * 60, // 7 days
			},
		},
	},
	pages: {
		signIn: "/login",
		error: "/auth/error",
	},
	callbacks: {
		async session({ session, user }) {
			return {
				...session,
				user: {
					...session.user,
					id: user.id,
					isProfessional: user.isProfessional,
					phone: user.phone,
				},
			};
		},
		async redirect({ url, baseUrl }) {
			// Allows relative callback URLs
			if (url.startsWith("/")) return `${baseUrl}${url}`;
			// Allows callback URLs on the same origin
			if (new URL(url).origin === baseUrl) return url;
			return baseUrl;
		},
	},
	events: {
		async createUser({ user }) {
			// Log user creation for analytics
			console.log(`New user created: ${user.email}`);
		},
		async signIn({ user, account, profile }) {
			// Log successful sign-ins
			console.log(`User signed in: ${user.email} via ${account?.provider}`);
		},
	},
	debug: process.env.NODE_ENV === "development",
} satisfies NextAuthConfig;
