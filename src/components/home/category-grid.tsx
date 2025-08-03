"use client";

import {
	Briefcase,
	Camera,
	Car,
	Flower2,
	GraduationCap,
	Hammer,
	Heart,
	Home,
	Monitor,
	PaintBucket,
	Scissors,
	Settings,
	Shield,
	Sparkles,
	Truck,
	Utensils,
	Wrench,
	Zap,
} from "lucide-react";
import Link from "next/link";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { api } from "~/trpc/react";

const categoryIcons: Record<
	string,
	{
		icon: React.ComponentType<{ className?: string }>;
		color: string;
		bgColor: string;
	}
> = {
	"Casa e Jardim": {
		icon: Home,
		color: "text-green-600",
		bgColor: "bg-green-100 group-hover:bg-green-200",
	},
	"Reformas e Reparos": {
		icon: Hammer,
		color: "text-orange-600",
		bgColor: "bg-orange-100 group-hover:bg-orange-200",
	},
	Limpeza: {
		icon: Sparkles,
		color: "text-blue-600",
		bgColor: "bg-blue-100 group-hover:bg-blue-200",
	},
	Elétrica: {
		icon: Zap,
		color: "text-yellow-600",
		bgColor: "bg-yellow-100 group-hover:bg-yellow-200",
	},
	Encanamento: {
		icon: Wrench,
		color: "text-indigo-600",
		bgColor: "bg-indigo-100 group-hover:bg-indigo-200",
	},
	Pintura: {
		icon: PaintBucket,
		color: "text-purple-600",
		bgColor: "bg-purple-100 group-hover:bg-purple-200",
	},
	"Beleza e Bem-estar": {
		icon: Scissors,
		color: "text-pink-600",
		bgColor: "bg-pink-100 group-hover:bg-pink-200",
	},
	Automotivo: {
		icon: Car,
		color: "text-gray-600",
		bgColor: "bg-gray-100 group-hover:bg-gray-200",
	},
	Negócios: {
		icon: Briefcase,
		color: "text-teal-600",
		bgColor: "bg-teal-100 group-hover:bg-teal-200",
	},
	Jardinagem: {
		icon: Flower2,
		color: "text-green-600",
		bgColor: "bg-green-100 group-hover:bg-green-200",
	},
	Tecnologia: {
		icon: Monitor,
		color: "text-blue-600",
		bgColor: "bg-blue-100 group-hover:bg-blue-200",
	},
	Fotografia: {
		icon: Camera,
		color: "text-indigo-600",
		bgColor: "bg-indigo-100 group-hover:bg-indigo-200",
	},
	Culinária: {
		icon: Utensils,
		color: "text-red-600",
		bgColor: "bg-red-100 group-hover:bg-red-200",
	},
	Saúde: {
		icon: Heart,
		color: "text-red-600",
		bgColor: "bg-red-100 group-hover:bg-red-200",
	},
	Educação: {
		icon: GraduationCap,
		color: "text-purple-600",
		bgColor: "bg-purple-100 group-hover:bg-purple-200",
	},
	Mudanças: {
		icon: Truck,
		color: "text-orange-600",
		bgColor: "bg-orange-100 group-hover:bg-orange-200",
	},
	Segurança: {
		icon: Shield,
		color: "text-gray-600",
		bgColor: "bg-gray-100 group-hover:bg-gray-200",
	},
	Manutenção: {
		icon: Settings,
		color: "text-blue-600",
		bgColor: "bg-blue-100 group-hover:bg-blue-200",
	},
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
							const iconConfig = categoryIcons[category.name] || {
								icon: Home,
								color: "text-indigo-600",
								bgColor: "bg-indigo-100 group-hover:bg-indigo-200",
							};
							const IconComponent = iconConfig.icon;
							return (
								<Link
									key={`default-category-${category.name}-${index}`}
									href={`/search?category=${encodeURIComponent(category.name)}`}
								>
									<Card className="group hover:-translate-y-2 border-0 shadow-md transition-all duration-300 hover:shadow-indigo-100/50 hover:shadow-xl">
										<CardContent className="flex flex-col items-center p-6 text-center">
											<div
												className={`mb-4 rounded-full p-4 transition-all duration-300 group-hover:scale-110 ${iconConfig.bgColor}`}
											>
												<IconComponent
													className={`h-8 w-8 ${iconConfig.color}`}
												/>
											</div>
											<h3 className="mb-2 font-semibold text-gray-900 group-hover:text-gray-700">
												{category.name}
											</h3>
											<p className="text-gray-600 text-sm group-hover:text-gray-500">
												{category.description}
											</p>
											<div className="mt-2 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
												<span className="font-medium text-indigo-600 text-xs">
													Ver serviços →
												</span>
											</div>
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

				<div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
					{categories.map((category) => {
						const iconConfig = categoryIcons[category.name] || {
							icon: Home,
							color: "text-indigo-600",
							bgColor: "bg-indigo-100 group-hover:bg-indigo-200",
						};
						const IconComponent = iconConfig.icon;
						return (
							<Link key={category.id} href={`/search?category=${category.id}`}>
								<Card className="group hover:-translate-y-2 cursor-pointer border-0 shadow-md transition-all duration-300 hover:shadow-indigo-100/50 hover:shadow-xl">
									<CardContent className="flex flex-col items-center p-6 text-center">
										<div
											className={`mb-4 rounded-full p-4 transition-all duration-300 group-hover:scale-110 ${iconConfig.bgColor}`}
										>
											<IconComponent
												className={`h-8 w-8 ${iconConfig.color}`}
											/>
										</div>
										<h3 className="mb-2 font-semibold text-gray-900 group-hover:text-gray-700">
											{category.name}
										</h3>
										<p className="text-gray-600 text-sm group-hover:text-gray-500">
											{`Serviços de ${category.name.toLowerCase()}`}
										</p>
										<div className="mt-2 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
											<span className="font-medium text-indigo-600 text-xs">
												Ver serviços →
											</span>
										</div>
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
