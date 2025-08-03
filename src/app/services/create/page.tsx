"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ServiceForm } from "~/components/services/service-form";
import { Loading } from "~/components/ui/loading";
import { useAuthGuard } from "~/hooks/use-auth-guard";

export default function CreateServicePage() {
	const router = useRouter();
	const [showForm, setShowForm] = useState(true);
	const { canAccess, isLoading } = useAuthGuard({
		requireProfessional: true,
	});

	if (isLoading) {
		return <Loading className="min-h-screen" size="lg" text="Carregando..." />;
	}

	if (!canAccess) {
		return null;
	}

	const handleClose = () => {
		router.push("/dashboard/services");
	};

	return (
		<main className="min-h-screen bg-gray-50 py-8">
			<div className="container mx-auto px-4">
				<div className="mb-8">
					<h1 className="mb-4 font-bold text-3xl text-gray-900">
						Criar Novo Serviço
					</h1>
					<p className="text-gray-600">
						Preencha os detalhes do seu serviço para começar a receber clientes
					</p>
				</div>

				{showForm && (
					<div className="mx-auto max-w-4xl">
						<ServiceForm service={null} onClose={handleClose} />
					</div>
				)}
			</div>
		</main>
	);
}
