import "~/styles/globals.css";

import type { Metadata } from "next";
import { Geist } from "next/font/google";

import { Providers } from "~/components/providers";
import { PWAProvider } from "~/components/pwa/pwa-provider";
import { TRPCReactProvider } from "~/trpc/react";

export const metadata: Metadata = {
	title: "NLSN Services Marketplace",
	description:
		"A modern peer-to-peer services marketplace where professionals showcase their skills and connect with clients",
	icons: [{ rel: "icon", url: "/favicon.ico" }],
	manifest: "/manifest.json",
	themeColor: "#3b82f6",
	viewport: "width=device-width, initial-scale=1, shrink-to-fit=no",
	appleWebApp: {
		capable: true,
		statusBarStyle: "default",
		title: "Services Marketplace",
	},
	openGraph: {
		title: "NLSN Services Marketplace",
		description:
			"A modern peer-to-peer services marketplace where professionals showcase their skills and connect with clients",
		type: "website",
		siteName: "Services Marketplace",
	},
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
						<PWAProvider>{children}</PWAProvider>
					</Providers>
				</TRPCReactProvider>
			</body>
		</html>
	);
}
