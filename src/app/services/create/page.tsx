"use client";

import { Loading } from "~/components/ui/loading";
import { useAuthGuard } from "~/hooks/use-auth-guard";

export default function CreateServicePage() {
	const { canAccess, isLoading, user } = useAuthGuard({
		requireProfessional: true,
	});

	if (isLoading) {
		return <Loading className="min-h-screen" size="lg" text="Loading..." />;
	}

	if (!canAccess) {
		return null;
	}

	return (
		<div className="container mx-auto px-4 py-8">
			<h1 className="font-bold text-3xl">Create New Service</h1>
			<p className="mt-4 text-gray-600">
				This page is protected and requires professional access. The middleware
				will redirect non-professional users to the become-professional page.
			</p>

			<div className="mt-8 rounded-lg bg-gray-50 p-6">
				<p className="text-gray-700 text-sm">
					Logged in as: <strong>{user?.name || user?.email}</strong>
				</p>
				<p className="text-gray-700 text-sm">
					Professional status: <strong>Active</strong>
				</p>
			</div>
		</div>
	);
}
