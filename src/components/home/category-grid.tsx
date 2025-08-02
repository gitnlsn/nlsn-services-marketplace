"use client";

import {
	Briefcase,
	Car,
	Hammer,
	Home,
	PaintBucket,
	Scissors,
	Wrench,
	Zap,
} from "lucide-react";
import Link from "next/link";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { api } from "~/trpc/react";

const categoryIcons: Record<
	string,
	React.ComponentType<{ className?: string }>
> = {
	"Casa e Jardim": Home,
	"Reformas e Reparos": Hammer,
	Limpeza: Home,
	Elétrica: Zap,
	Encanamento: Wrench,
	Pintura: PaintBucket,
	"Beleza e Bem-estar": Scissors,
	Automotivo: Car,
	Negócios: Briefcase,
};

export function CategoryGrid() {
	const { data: categories, isLoading } = api.category.list.useQuery({});

	if (isLoading) {
		return (
			<section className="py-16">
				<div className="container mx-auto px-4">
					<h2 className="mb-8 text-center font-bold text-3xl">
						Categorias de Serviços
					</h2>
					<div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
						{Array.from({ length: 8 }).map((_, i) => (
							<Card
								key={`category-skeleton-${crypto.randomUUID()}-${i}`}
								className="animate-pulse"
							>
								<CardContent className="flex flex-col items-center p-6 text-center">
									<div className="mb-4 h-12 w-12 rounded-full bg-gray-200" />
									<div className="mb-2 h-4 w-3/4 rounded bg-gray-200" />
									<div className="h-3 w-1/2 rounded bg-gray-200" />
								</CardContent>
							</Card>
						))}
					</div>
				</div>
			</section>
		);
	}

	if (!categories?.length) {
		return (
			<section className="py-16">
				<div className="container mx-auto px-4">
					<h2 className="mb-8 text-center font-bold text-3xl">
						Categorias de Serviços
					</h2>
					<div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
						{[
							{ name: "Casa e Jardim", description: "Serviços domésticos" },
							{
								name: "Reformas e Reparos",
								description: "Construção e reforma",
							},
							{ name: "Limpeza", description: "Limpeza residencial" },
							{ name: "Elétrica", description: "Serviços elétricos" },
							{ name: "Encanamento", description: "Hidráulica e encanamento" },
							{ name: "Pintura", description: "Pintura e acabamento" },
							{ name: "Beleza e Bem-estar", description: "Cuidados pessoais" },
							{ name: "Automotivo", description: "Serviços automotivos" },
						].map((category, index) => {
							const IconComponent = categoryIcons[category.name] || Home;
							return (
								<Link
									key={`default-category-${category.name}-${index}`}
									href={`/search?category=${encodeURIComponent(category.name)}`}
								>
									<Card className="group hover:-translate-y-1 transition-all hover:border-indigo-200 hover:shadow-lg">
										<CardContent className="flex flex-col items-center p-6 text-center">
											<div className="mb-4 rounded-full bg-indigo-100 p-3 transition-colors group-hover:bg-indigo-200">
												<IconComponent className="h-6 w-6 text-indigo-600" />
											</div>
											<h3 className="mb-2 font-semibold text-gray-900">
												{category.name}
											</h3>
											<p className="text-gray-600 text-sm">
												{category.description}
											</p>
										</CardContent>
									</Card>
								</Link>
							);
						})}
					</div>
				</div>
			</section>
		);
	}

	return (
		<section className="py-16">
			<div className="container mx-auto px-4">
				<div className="mb-12 text-center">
					<h2 className="mb-4 font-bold text-3xl text-gray-900">
						Categorias de Serviços
					</h2>
					<p className="text-gray-600 text-lg">
						Encontre o profissional ideal para o que você precisa
					</p>
				</div>

				<div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
					{categories.map((category) => {
						const IconComponent = categoryIcons[category.name] || Home;
						return (
							<Link key={category.id} href={`/search?category=${category.id}`}>
								<Card className="group hover:-translate-y-1 transition-all hover:border-indigo-200 hover:shadow-lg">
									<CardContent className="flex flex-col items-center p-6 text-center">
										<div className="mb-4 rounded-full bg-indigo-100 p-3 transition-colors group-hover:bg-indigo-200">
											<IconComponent className="h-6 w-6 text-indigo-600" />
										</div>
										<h3 className="mb-2 font-semibold text-gray-900">
											{category.name}
										</h3>
										<p className="text-gray-600 text-sm">
											{`Serviços de ${category.name.toLowerCase()}`}
										</p>
									</CardContent>
								</Card>
							</Link>
						);
					})}
				</div>

				<div className="mt-12 text-center">
					<Link href="/search">
						<Button variant="outline" size="lg" className="px-8">
							Ver Todas as Categorias
						</Button>
					</Link>
				</div>
			</div>
		</section>
	);
}
