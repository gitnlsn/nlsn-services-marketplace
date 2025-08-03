import { ServiceDetail } from "~/components/services/service-detail";

interface ServicePageProps {
	params: Promise<{ id: string }>;
}

export default async function ServicePage({ params }: ServicePageProps) {
	const { id } = await params;
	return (
		<main className="min-h-screen bg-gray-50">
			<ServiceDetail serviceId={id} />
		</main>
	);
}
