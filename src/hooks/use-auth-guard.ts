"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "~/contexts/auth-context";

export interface UseAuthGuardOptions {
	redirectTo?: string;
	requireProfessional?: boolean;
	enabled?: boolean;
}

export function useAuthGuard(options: UseAuthGuardOptions = {}) {
	const {
		redirectTo = "/login",
		requireProfessional = false,
		enabled = true,
	} = options;

	const router = useRouter();
	const { isAuthenticated, isLoading, isProfessional, user } = useAuth();

	useEffect(() => {
		if (!enabled || isLoading) return;

		if (!isAuthenticated) {
			const currentPath = window.location.pathname;
			const returnUrl = encodeURIComponent(currentPath);
			router.push(`${redirectTo}?returnUrl=${returnUrl}`);
		} else if (requireProfessional && !isProfessional) {
			const currentPath = window.location.pathname;
			const returnUrl = encodeURIComponent(currentPath);
			router.push(`/become-professional?returnUrl=${returnUrl}`);
		}
	}, [
		enabled,
		isAuthenticated,
		isLoading,
		isProfessional,
		requireProfessional,
		redirectTo,
		router,
	]);

	return {
		isAuthenticated,
		isLoading,
		isProfessional,
		canAccess: isAuthenticated && (!requireProfessional || isProfessional),
		user,
	};
}
