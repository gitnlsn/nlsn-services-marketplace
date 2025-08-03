"use client";

import { useSession } from "next-auth/react";
import { ProfileEditForm } from "~/components/profile/profile-edit-form";
import { Loading } from "~/components/ui/loading";
import { api } from "~/trpc/react";

export default function ProfilePage() {
	const { data: session, status } = useSession();
	const { data: user, isLoading } = api.user.getCurrentUser.useQuery(
		undefined,
		{ enabled: !!session },
	);

	if (status === "loading" || isLoading) {
		return (
			<Loading className="min-h-screen" size="lg" text="Carregando perfil..." />
		);
	}

	if (!session || !user) {
		return (
			<div className="container mx-auto px-4 py-8 text-center">
				<h1 className="mb-4 font-bold text-2xl text-gray-900">Acesso negado</h1>
				<p className="text-gray-600">
					Você precisa estar autenticado para acessar esta página.
				</p>
			</div>
		);
	}

	return (
		<div className="container mx-auto max-w-4xl px-4 py-8">
			<h1 className="mb-8 font-bold text-3xl text-gray-900">Meu Perfil</h1>

			<div className="space-y-6">
				<ProfileEditForm user={user} />

				{/* Additional sections can be added here */}
				{user.isProfessional && (
					<div className="rounded-lg border bg-blue-50 p-6">
						<h3 className="mb-2 font-semibold text-blue-900 text-lg">
							Dica: Complete seu perfil
						</h3>
						<p className="text-blue-700">
							Um perfil completo com foto e descrição aumenta suas chances de
							receber mais contratações. Clientes preferem profissionais com
							perfis detalhados.
						</p>
					</div>
				)}
			</div>
		</div>
	);
}
