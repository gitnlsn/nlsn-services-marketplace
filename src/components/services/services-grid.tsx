"use client";

import { FunnelIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { useState } from "react";
import { api } from "~/trpc/react";
import { ServiceCard } from "./service-card";

type ServiceWithDetails = {
	id: string;
	title: string;
	description: string;
	price: number;
	priceType: "fixed" | "hourly";
	location: string | null;
	duration: number | null;
	category: {
		id: string;
		name: string;
	};
	provider: {
		id: string;
		name: string | null;
		image: string | null;
		isProfessional: boolean;
	};
	images: Array<{
		id: string;
		url: string;
	}>;
	_count: {
		bookings: number;
		reviews: number;
	};
	avgRating: number | null;
	viewCount: number;
};

interface ServicesGridProps {
	initialQuery?: string;
	categoryId?: string;
}

export function ServicesGrid({
	initialQuery = "",
	categoryId,
}: ServicesGridProps) {
	const [searchQuery, setSearchQuery] = useState(initialQuery);
	const [selectedCategory, setSelectedCategory] = useState(categoryId || "");
	const [priceRange, setPriceRange] = useState<{ min?: number; max?: number }>(
		{},
	);
	const [sortBy, setSortBy] = useState<
		"newest" | "popular" | "rating" | "price_low" | "price_high"
	>("newest");

	// Get categories for filter
	const { data: categories } = api.search.getCategories.useQuery();

	// Search services
	const { data: searchResults, isLoading } = api.search.searchServices.useQuery(
		{
			query: searchQuery,
			categoryId: selectedCategory || undefined,
			minPrice: priceRange.min,
			maxPrice: priceRange.max,
			limit: 12,
			offset: 0,
		},
	);

	const handleSearch = (e: React.FormEvent) => {
		e.preventDefault();
		// The query will automatically update due to the dependency in useInfiniteQuery
	};

	const services = (searchResults?.services as ServiceWithDetails[]) || [];

	return (
		<div className="min-h-screen bg-gray-50 py-8">
			<div className="container mx-auto px-4">
				{/* Search Header */}
				<div className="mb-8">
					<h1 className="mb-6 font-bold text-3xl text-gray-900">
						{searchQuery
							? `Resultados para "${searchQuery}"`
							: "Todos os Serviços"}
					</h1>

					{/* Search Bar */}
					<form onSubmit={handleSearch} className="mb-6">
						<div className="relative max-w-2xl">
							<input
								type="text"
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								placeholder="Buscar serviços..."
								className="w-full rounded-lg border border-gray-300 py-3 pr-12 pl-4 focus:border-indigo-500 focus:ring-indigo-500"
							/>
							<button
								type="submit"
								className="absolute top-2 right-2 rounded-lg bg-indigo-600 p-2 text-white hover:bg-indigo-700"
							>
								<MagnifyingGlassIcon className="h-5 w-5" />
							</button>
						</div>
					</form>

					{/* Filters */}
					<div className="flex flex-wrap items-center gap-4">
						{/* Category Filter */}
						<div className="flex items-center gap-2">
							<FunnelIcon className="h-5 w-5 text-gray-400" />
							<select
								value={selectedCategory}
								onChange={(e) => setSelectedCategory(e.target.value)}
								className="rounded-lg border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:ring-indigo-500"
							>
								<option value="">Todas as categorias</option>
								{categories?.map((category) => (
									<option key={category.id} value={category.id}>
										{category.name} ({category.serviceCount})
									</option>
								))}
							</select>
						</div>

						{/* Price Range */}
						<div className="flex items-center gap-2">
							<span className="text-gray-600 text-sm">Preço:</span>
							<input
								type="number"
								placeholder="Mín"
								value={priceRange.min || ""}
								onChange={(e) =>
									setPriceRange((prev) => ({
										...prev,
										min: e.target.value ? Number(e.target.value) : undefined,
									}))
								}
								className="w-20 rounded border border-gray-300 px-2 py-1 text-sm focus:border-indigo-500"
							/>
							<span className="text-gray-400">-</span>
							<input
								type="number"
								placeholder="Máx"
								value={priceRange.max || ""}
								onChange={(e) =>
									setPriceRange((prev) => ({
										...prev,
										max: e.target.value ? Number(e.target.value) : undefined,
									}))
								}
								className="w-20 rounded border border-gray-300 px-2 py-1 text-sm focus:border-indigo-500"
							/>
						</div>

						{/* Sort */}
						<div className="flex items-center gap-2">
							<span className="text-gray-600 text-sm">Ordenar:</span>
							<select
								value={sortBy}
								onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
								className="rounded border border-gray-300 px-2 py-1 text-sm focus:border-indigo-500"
							>
								<option value="newest">Mais recentes</option>
								<option value="popular">Mais populares</option>
								<option value="rating">Melhor avaliados</option>
								<option value="price_low">Menor preço</option>
								<option value="price_high">Maior preço</option>
							</select>
						</div>
					</div>
				</div>

				{/* Results */}
				{isLoading ? (
					<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
						{Array.from({ length: 8 }, (_, i) => (
							<div
								key={`services-skeleton-${crypto.randomUUID()}-${i}`}
								className="animate-pulse"
							>
								<div className="mb-4 h-48 rounded-lg bg-gray-300" />
								<div className="mb-2 h-4 rounded bg-gray-300" />
								<div className="mb-2 h-4 w-3/4 rounded bg-gray-300" />
								<div className="h-8 rounded bg-gray-300" />
							</div>
						))}
					</div>
				) : services.length > 0 ? (
					<>
						<div className="mb-4 text-gray-600 text-sm">
							{searchResults?.totalCount || 0} serviços encontrados
						</div>

						<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
							{services.map((service) => (
								<ServiceCard key={service.id} service={service} />
							))}
						</div>
					</>
				) : (
					<div className="py-12 text-center">
						<div className="mb-4 text-gray-400">
							<MagnifyingGlassIcon className="mx-auto h-16 w-16" />
						</div>
						<h3 className="mb-2 font-semibold text-gray-900 text-xl">
							Nenhum serviço encontrado
						</h3>
						<p className="mb-4 text-gray-600">
							Tente ajustar seus filtros ou buscar por outros termos.
						</p>
						<button
							type="button"
							onClick={() => {
								setSearchQuery("");
								setSelectedCategory("");
								setPriceRange({});
							}}
							className="rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700"
						>
							Limpar filtros
						</button>
					</div>
				)}
			</div>
		</div>
	);
}
