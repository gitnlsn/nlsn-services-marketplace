import { ServiceDetail } from "~/components/services/service-detail";

interface ServicePageProps {
	params: { id: string };
}

export default function ServicePage({ params }: ServicePageProps) {
	return (
		<main className="min-h-screen bg-gray-50">
			<ServiceDetail serviceId={params.id} />
		</main>
	);
}
