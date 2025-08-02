"use client";

import { useSession } from "next-auth/react";
import { CustomerDashboard } from "~/components/dashboard/customer-dashboard";
import { ProfessionalDashboard } from "~/components/dashboard/professional-dashboard";
import { Loading } from "~/components/ui/loading";
import { api } from "~/trpc/react";

export default function DashboardPage() {
	const { data: session, status } = useSession();
	const { data: user, isLoading: userLoading } =
		api.user.getCurrentUser.useQuery(undefined, { enabled: !!session });

	if (status === "loading" || userLoading) {
		return (
			<Loading className="min-h-screen" size="lg" text="Loading dashboard..." />
		);
	}

	if (!session) {
		// Redirect to login handled by middleware
		return null;
	}

	// Show professional dashboard if user is a professional
	if (user?.isProfessional) {
		return <ProfessionalDashboard />;
	}

	// Show customer dashboard for regular users
	return <CustomerDashboard />;
}
