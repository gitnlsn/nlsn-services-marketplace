"use client";

import {
	CalendarIcon,
	CheckCircleIcon,
	CurrencyDollarIcon,
	DocumentPlusIcon,
	MagnifyingGlassIcon,
	UserPlusIcon,
} from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";
import * as React from "react";
import { Button } from "~/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";

export function HowItWorks() {
	const router = useRouter();
	const [tabValue, setTabValue] = React.useState("customer");

	const customerSteps = [
		{
			id: "find-professional",
			icon: MagnifyingGlassIcon,
			title: "Encontre o Profissional",
			description:
				"Busque e compare profissionais qualificados para o seu projeto",
		},
		{
			id: "schedule-service",
			icon: CalendarIcon,
			title: "Agende o Serviço",
			description: "Escolha data e horário que melhor se adequam à sua rotina",
		},
		{
			id: "service-completed",
			icon: CheckCircleIcon,
			title: "Serviço Realizado",
			description: "Acompanhe o serviço e pague com segurança após a conclusão",
		},
	];

	const professionalSteps = [
		{
			id: "create-profile",
			icon: UserPlusIcon,
			title: "Crie seu Perfil",
			description: "Cadastre-se e mostre suas qualificações e experiência",
		},
		{
			id: "offer-services",
			icon: DocumentPlusIcon,
			title: "Ofereça seus Serviços",
			description: "Liste seus serviços com fotos, preços e disponibilidade",
		},
		{
			id: "receive-payments",
			icon: CurrencyDollarIcon,
			title: "Receba pelos Trabalhos",
			description: "Atenda clientes e receba pagamentos de forma segura",
		},
	];

	return (
		<section className="bg-white py-16">
			<div className="container mx-auto px-4">
				<div className="mb-12 text-center">
					<h2 className="mb-4 font-bold text-3xl text-gray-900">
						Como Funciona
					</h2>
					<p className="text-gray-600 text-lg">
						Simples, rápido e seguro para todos
					</p>
				</div>

				<Tabs
					value={tabValue}
					onValueChange={setTabValue}
					className="mx-auto max-w-4xl"
				>
					<TabsList className="grid w-full grid-cols-2">
						<TabsTrigger value="customer">Para Clientes</TabsTrigger>
						<TabsTrigger value="professional">Para Profissionais</TabsTrigger>
					</TabsList>

					<TabsContent value="customer" className="mt-8">
						<div className="grid gap-8 md:grid-cols-3">
							{customerSteps.map((step, index) => (
								<div key={step.id} className="text-center">
									<div className="mb-4 flex justify-center">
										<div className="flex h-20 w-20 items-center justify-center rounded-full bg-indigo-100">
											<step.icon className="h-10 w-10 text-indigo-600" />
										</div>
									</div>
									<div className="mb-2 font-semibold text-gray-500 text-sm">
										Passo {index + 1}
									</div>
									<h3 className="mb-2 font-semibold text-gray-900 text-xl">
										{step.title}
									</h3>
									<p className="text-gray-600">{step.description}</p>
								</div>
							))}
						</div>
						<div className="mt-12 text-center">
							<Button
								size="lg"
								onClick={() => router.push("/search")}
								className="px-8"
							>
								Encontrar Profissionais
							</Button>
						</div>
					</TabsContent>

					<TabsContent value="professional" className="mt-8">
						<div className="grid gap-8 md:grid-cols-3">
							{professionalSteps.map((step, index) => (
								<div key={step.id} className="text-center">
									<div className="mb-4 flex justify-center">
										<div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
											<step.icon className="h-10 w-10 text-green-600" />
										</div>
									</div>
									<div className="mb-2 font-semibold text-gray-500 text-sm">
										Passo {index + 1}
									</div>
									<h3 className="mb-2 font-semibold text-gray-900 text-xl">
										{step.title}
									</h3>
									<p className="text-gray-600">{step.description}</p>
								</div>
							))}
						</div>
						<div className="mt-12 text-center">
							<Button
								size="lg"
								onClick={() => router.push("/become-professional")}
								className="bg-green-600 px-8 hover:bg-green-700"
							>
								Começar a Oferecer Serviços
							</Button>
						</div>
					</TabsContent>
				</Tabs>
			</div>
		</section>
	);
}
