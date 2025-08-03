import "~/styles/globals.css";

import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";

import { AppLayout } from "~/components/navigation/app-layout";
import { Providers } from "~/components/providers";
import { PWAProvider } from "~/components/pwa/pwa-provider";
import { Toaster } from "~/components/ui/toaster";
import { TRPCReactProvider } from "~/trpc/react";

export const metadata: Metadata = {
	title: "Savoir Link",
	description:
		"Savoir Link - A modern peer-to-peer services marketplace where professionals showcase their skills and connect with clients",
	icons: [{ rel: "icon", url: "/favicon.ico" }],
	manifest: "/manifest.json",
	appleWebApp: {
		capable: true,
		statusBarStyle: "default",
		title: "Savoir Link",
	},
	openGraph: {
		title: "Savoir Link",
		description:
			"Savoir Link - A modern peer-to-peer services marketplace where professionals showcase their skills and connect with clients",
		type: "website",
		siteName: "Savoir Link",
	},
};

export const viewport: Viewport = {
	width: "device-width",
	initialScale: 1,
	themeColor: "#3b82f6",
};

const geist = Geist({
	subsets: ["latin"],
	variable: "--font-geist-sans",
});

export default function RootLayout({
	children,
}: Readonly<{ children: React.ReactNode }>) {
	return (
		<html lang="en" className={`${geist.variable}`}>
			<body>
				<TRPCReactProvider>
					<Providers>
						<PWAProvider>
							<AppLayout>{children}</AppLayout>
							<Toaster />
						</PWAProvider>
					</Providers>
				</TRPCReactProvider>
			</body>
		</html>
	);
}
