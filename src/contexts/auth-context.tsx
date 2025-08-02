"use client";

import { useSession } from "next-auth/react";
import {
	type ReactNode,
	createContext,
	useCallback,
	useContext,
	useEffect,
	useState,
} from "react";
import { api } from "~/trpc/react";

interface User {
	id: string;
	email: string | null;
	name: string | null;
	image: string | null;
	isProfessional: boolean;
	phone: string | null;
	createdAt: Date;
	updatedAt: Date;
}

interface AuthContextType {
	user: User | null;
	isAuthenticated: boolean;
	isLoading: boolean;
	isProfessional: boolean;
	sessionToken: string | null;
	refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
	children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
	const { data: session, status, update } = useSession();
	const [user, setUser] = useState<User | null>(null);
	const [sessionToken, setSessionToken] = useState<string | null>(null);

	// tRPC query to get user details
	const { data: userData, refetch: refetchUser } =
		api.user.getCurrentUser.useQuery(undefined, {
			enabled: !!session?.user?.id,
			retry: 1,
		});

	// Auto-refresh session every 30 minutes to maintain activity
	useEffect(() => {
		if (!session?.user) return;

		const refreshInterval = setInterval(
			async () => {
				try {
					await update();
				} catch (error) {
					console.error("Failed to refresh session:", error);
				}
			},
			30 * 60 * 1000,
		); // 30 minutes

		return () => clearInterval(refreshInterval);
	}, [session?.user, update]);

	// Update user state when session or user data changes
	useEffect(() => {
		if (session?.user && userData) {
			setUser({
				id: userData.id,
				email: userData.email,
				name: userData.name,
				image: userData.image,
				isProfessional: userData.isProfessional,
				phone: userData.phone,
				createdAt: userData.createdAt,
				updatedAt: userData.updatedAt,
			});
			// Store session token if available
			setSessionToken(session.accessToken ?? null);
		} else if (!session) {
			setUser(null);
			setSessionToken(null);
		}
	}, [session, userData]);

	// Refresh user data and session
	const refreshUser = useCallback(async () => {
		if (session?.user?.id) {
			await refetchUser();
			// Also update the session to ensure fresh tokens
			await update();
		}
	}, [session, refetchUser, update]);

	const contextValue: AuthContextType = {
		user,
		isAuthenticated: !!user && status === "authenticated",
		isLoading: status === "loading",
		isProfessional: user?.isProfessional ?? false,
		sessionToken,
		refreshUser,
	};

	return (
		<AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
	);
}

// Custom hook to use auth context
export function useAuth() {
	const context = useContext(AuthContext);
	if (context === undefined) {
		throw new Error("useAuth must be used within an AuthProvider");
	}
	return context;
}

// Utility hook for checking authentication status
export function useRequireAuth(redirectTo = "/auth/signin") {
	const { isAuthenticated, isLoading } = useAuth();
	const router = useRouter();

	useEffect(() => {
		if (!isLoading && !isAuthenticated) {
			const currentPath = window.location.pathname;
			const returnUrl = encodeURIComponent(currentPath);
			void router.push(`${redirectTo}?returnUrl=${returnUrl}`);
		}
	}, [isAuthenticated, isLoading, redirectTo, router]);

	return { isAuthenticated, isLoading };
}

// Utility hook for professional-only access
export function useRequireProfessional(redirectTo = "/") {
	const { user, isProfessional, isLoading } = useAuth();
	const router = useRouter();

	useEffect(() => {
		if (!isLoading && user && !isProfessional) {
			void router.push(redirectTo);
		}
	}, [user, isProfessional, isLoading, redirectTo, router]);

	return { isProfessional, isLoading };
}

// Import at the top of the file
import { useRouter } from "next/navigation";
