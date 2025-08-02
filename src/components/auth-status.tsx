"use client";

import { useAuth } from "~/contexts/auth-context";

export function AuthStatus() {
	const { user, isAuthenticated, isLoading, isProfessional } = useAuth();

	if (isLoading) {
		return (
			<div className="flex items-center gap-2 text-muted-foreground text-sm">
				<div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
				Loading...
			</div>
		);
	}

	if (!isAuthenticated) {
		return <div className="text-muted-foreground text-sm">Not logged in</div>;
	}

	return (
		<div className="flex items-center gap-2 text-sm">
			{user?.image && (
				<img
					src={user.image}
					alt={user.name ?? "User avatar"}
					className="h-8 w-8 rounded-full"
				/>
			)}
			<div>
				<div className="font-medium">{user?.name ?? user?.email}</div>
				<div className="text-muted-foreground text-xs">
					{isProfessional ? "Professional" : "Client"}
				</div>
			</div>
		</div>
	);
}
