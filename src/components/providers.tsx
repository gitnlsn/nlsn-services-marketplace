"use client";

import { SessionProvider } from "next-auth/react";
import type { ReactNode } from "react";
import { AuthProvider } from "~/contexts/auth-context";

interface ProvidersProps {
	children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
	return (
		<SessionProvider>
			<AuthProvider>{children}</AuthProvider>
		</SessionProvider>
	);
}
