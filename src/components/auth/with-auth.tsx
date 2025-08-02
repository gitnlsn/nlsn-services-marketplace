"use client";

import { useRouter } from "next/navigation";
import { type ComponentType, useEffect } from "react";

import { Loading } from "~/components/ui/loading";
import { useAuth } from "~/contexts/auth-context";

export interface WithAuthOptions {
	redirectTo?: string;
	requireProfessional?: boolean;
}

export function withAuth<P extends object>(
	Component: ComponentType<P>,
	options: WithAuthOptions = {},
) {
	const { redirectTo = "/login", requireProfessional = false } = options;

	return function AuthenticatedComponent(props: P) {
		const router = useRouter();
		const { isAuthenticated, isLoading, isProfessional } = useAuth();

		useEffect(() => {
			if (!isLoading) {
				if (!isAuthenticated) {
					const currentPath = window.location.pathname;
					const returnUrl = encodeURIComponent(currentPath);
					router.push(`${redirectTo}?returnUrl=${returnUrl}`);
				} else if (requireProfessional && !isProfessional) {
					router.push("/become-professional");
				}
			}
		}, [isAuthenticated, isLoading, isProfessional, router]);

		if (isLoading) {
			return <Loading className="min-h-screen" size="lg" text="Loading..." />;
		}

		if (!isAuthenticated || (requireProfessional && !isProfessional)) {
			return null;
		}

		return <Component {...props} />;
	};
}
