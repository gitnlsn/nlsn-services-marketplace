import "~/styles/globals.css";

import type { Metadata } from "next";
import { Geist } from "next/font/google";

import { Providers } from "~/components/providers";
import { TRPCReactProvider } from "~/trpc/react";

export const metadata: Metadata = {
	title: "NLSN Services Marketplace",
	description:
		"A modern peer-to-peer services marketplace where professionals showcase their skills and connect with clients",
	icons: [{ rel: "icon", url: "/favicon.ico" }],
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
					<Providers>{children}</Providers>
				</TRPCReactProvider>
			</body>
		</html>
	);
}
