"use client";

import { withAuth } from "~/components/auth/with-auth";
import { Card, CardContent, CardHeader } from "~/components/ui/card";
import { useAuth } from "~/contexts/auth-context";

function ProfilePage() {
	const { user, isProfessional } = useAuth();

	return (
		<div className="container mx-auto px-4 py-8">
			<h1 className="font-bold text-3xl">My Profile</h1>

			<Card className="mt-8">
				<CardHeader>
					<div className="flex items-center gap-4">
						{user?.image && (
							<img
								src={user.image}
								alt={user.name ?? "Profile"}
								className="h-20 w-20 rounded-full"
							/>
						)}
						<div>
							<h2 className="font-semibold text-xl">{user?.name}</h2>
							<p className="text-muted-foreground">{user?.email}</p>
							<p className="mt-1 text-muted-foreground text-sm">
								{isProfessional ? "Professional Account" : "Client Account"}
							</p>
						</div>
					</div>
				</CardHeader>
			</Card>
		</div>
	);
}

export default withAuth(ProfilePage);
