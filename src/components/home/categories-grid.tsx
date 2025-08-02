"use client";

import {
	BoltIcon,
	HomeIcon,
	PaintBrushIcon,
	SparklesIcon,
	WrenchIcon,
	WrenchScrewdriverIcon,
} from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";

const categories = [
	{
		id: "limpeza",
		name: "Limpeza",
		icon: SparklesIcon,
		serviceCount: 150,
		color: "bg-blue-100 text-blue-600",
	},
	{
		id: "eletricista",
		name: "Eletricista",
		icon: BoltIcon,
		serviceCount: 89,
		color: "bg-yellow-100 text-yellow-600",
	},
	{
		id: "encanador",
		name: "Encanador",
		icon: WrenchIcon,
		serviceCount: 67,
		color: "bg-indigo-100 text-indigo-600",
	},
	{
		id: "pintor",
		name: "Pintor",
		icon: PaintBrushIcon,
		serviceCount: 45,
		color: "bg-green-100 text-green-600",
	},
	{
		id: "montagem",
		name: "Montagem",
		icon: WrenchScrewdriverIcon,
		serviceCount: 72,
		color: "bg-purple-100 text-purple-600",
	},
	{
		id: "reforma",
		name: "Reforma",
		icon: HomeIcon,
		serviceCount: 38,
		color: "bg-red-100 text-red-600",
	},
];

export function CategoriesGrid() {
	const router = useRouter();

	const handleCategoryClick = (categoryId: string) => {
		router.push(`/search?category=${categoryId}`);
	};

	return (
		<section className="bg-white py-16">
			<div className="container mx-auto px-4">
				<div className="text-center">
					<h2 className="mb-4 font-bold text-3xl text-gray-900">
						Categorias Populares
					</h2>
					<p className="mb-12 text-gray-600 text-lg">
						Encontre rapidamente o que você precisa
					</p>
				</div>

				<div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
					{categories.map((category) => {
						const IconComponent = category.icon;
						return (
							<Button
								key={category.id}
								variant="outline"
								onClick={() => handleCategoryClick(category.id)}
								className="group relative h-auto flex-col p-6 text-center"
							>
								<div
									className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full ${category.color} transition-transform group-hover:scale-110`}
								>
									<IconComponent className="h-8 w-8" />
								</div>
								<h3 className="mb-2 font-semibold text-gray-900">
									{category.name}
								</h3>
								<div className="absolute top-2 right-2">
									<Badge variant="secondary" className="text-xs">
										{category.serviceCount}
									</Badge>
								</div>
								<div className="absolute inset-0 rounded-lg bg-primary opacity-0 transition-opacity group-hover:opacity-5" />
							</Button>
						);
					})}
				</div>

				<div className="mt-8 text-center">
					<Button variant="link" onClick={() => router.push("/categories")}>
						Ver todas as categorias →
					</Button>
				</div>
			</div>
		</section>
	);
}
