import { PublicProfile } from "~/components/profile/public-profile";

interface ProfilePageProps {
	params: Promise<{ id: string }>;
}

export default async function PublicProfilePage({ params }: ProfilePageProps) {
	const { id } = await params;
	return <PublicProfile userId={id} />;
}
