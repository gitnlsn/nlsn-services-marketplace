"use client";

import { Filter, Grid, Map as MapIcon, MapPin, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type React from "react";
import { useState } from "react";
import { MapView } from "~/components/map/map-view";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "~/components/ui/select";
import { Sheet, SheetContent, SheetTrigger } from "~/components/ui/sheet";
import { api } from "~/trpc/react";

interface SearchResultsProps {
	initialQuery: string;
	initialCategory: string;
}

export function SearchResults({
	initialQuery,
	initialCategory,
}: SearchResultsProps): React.ReactElement {
	const router = useRouter();
	const [searchQuery, setSearchQuery] = useState(initialQuery);
	const [selectedCategory, setSelectedCategory] = useState(initialCategory);
	const [priceType, setPriceType] = useState<"all" | "fixed" | "hourly">("all");
	const [minPrice, setMinPrice] = useState<string>("");
	const [maxPrice, setMaxPrice] = useState<string>("");
	const [location, setLocation] = useState<string>("");
	const [minRating, setMinRating] = useState<number>(0);
	const [sortBy, setSortBy] = useState<
		"relevance" | "price_asc" | "price_desc" | "rating" | "newest"
	>("relevance");
	const [viewMode, setViewMode] = useState<"grid" | "map">("grid");

	// Get categories for filter
	const { data: categories } = api.search.getCategories.useQuery();

	// Search services
	const {
		data: searchResults,
		isLoading,
		refetch,
	} = api.search.searchServices.useQuery({
		query: searchQuery || "serviços",
		categoryId: selectedCategory || undefined,
		priceType,
		minPrice: minPrice ? Number(minPrice) : undefined,
		maxPrice: maxPrice ? Number(maxPrice) : undefined,
		location: location || undefined,
		minRating: minRating > 0 ? minRating : undefined,
		sortBy,
		limit: 20,
	});

	const handleSearch = (e: React.FormEvent) => {
		e.preventDefault();
		const params = new URLSearchParams();
		if (searchQuery) params.set("q", searchQuery);
		if (selectedCategory) params.set("category", selectedCategory);
		router.push(`/search?${params.toString()}`);
		void refetch();
	};

	const clearFilters = () => {
		setSelectedCategory("");
		setPriceType("all");
		setMinPrice("");
		setMaxPrice("");
		setLocation("");
		setMinRating(0);
		setSortBy("relevance");
		void refetch();
	};

	const FiltersContent = () => (
		<div className="space-y-6">
			<div>
				<label
					htmlFor="category-select"
					className="mb-2 block font-medium text-sm"
				>
					Categoria
				</label>
				<Select value={selectedCategory} onValueChange={setSelectedCategory}>
					<SelectTrigger id="category-select">
						<SelectValue placeholder="Todas as categorias" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="">Todas as categorias</SelectItem>
						{categories?.map((category) => (
							<SelectItem key={category.id} value={category.id}>
								{category.name} ({category.serviceCount})
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			<div>
				<label
					htmlFor="price-type-select"
					className="mb-2 block font-medium text-sm"
				>
					Tipo de Preço
				</label>
				<Select
					value={priceType}
					onValueChange={(value: "all" | "fixed" | "hourly") =>
						setPriceType(value)
					}
				>
					<SelectTrigger id="price-type-select">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">Todos</SelectItem>
						<SelectItem value="fixed">Preço Fixo</SelectItem>
						<SelectItem value="hourly">Por Hora</SelectItem>
					</SelectContent>
				</Select>
			</div>

			<div>
				<label htmlFor="min-price" className="mb-2 block font-medium text-sm">
					Faixa de Preço
				</label>
				<div className="grid grid-cols-2 gap-2">
					<Input
						id="min-price"
						type="number"
						placeholder="Mín"
						value={minPrice}
						onChange={(e) => setMinPrice(e.target.value)}
					/>
					<Input
						id="max-price"
						type="number"
						placeholder="Máx"
						value={maxPrice}
						onChange={(e) => setMaxPrice(e.target.value)}
					/>
				</div>
			</div>

			<div>
				<label
					htmlFor="location-input"
					className="mb-2 block font-medium text-sm"
				>
					Localização
				</label>
				<Input
					id="location-input"
					type="text"
					placeholder="Digite a cidade ou região"
					value={location}
					onChange={(e) => setLocation(e.target.value)}
				/>
			</div>

			{/* Rating Filter */}
			<div>
				<p className="mb-2 block font-medium text-sm">Avaliação Mínima</p>
				<div className="flex items-center gap-1">
					{[1, 2, 3, 4, 5].map((rating) => (
						<button
							key={rating}
							type="button"
							onClick={() => setMinRating(rating === minRating ? 0 : rating)}
							className="transition-colors hover:scale-110"
						>
							<Star
								className={`h-6 w-6 ${
									rating <= minRating
										? "fill-yellow-400 text-yellow-400"
										: "text-gray-300 hover:text-yellow-400"
								}`}
							/>
						</button>
					))}
					{minRating > 0 && (
						<span className="ml-2 text-gray-600 text-sm">
							{minRating}+ estrelas
						</span>
					)}
				</div>
			</div>

			<div className="space-y-2">
				<Button onClick={() => refetch()} className="w-full">
					Aplicar Filtros
				</Button>
				<Button variant="outline" onClick={clearFilters} className="w-full">
					Limpar Filtros
				</Button>
			</div>
		</div>
	);

	return (
		<div className="container mx-auto px-4 py-8">
			{/* Search Header */}
			<div className="mb-8">
				<form onSubmit={handleSearch} className="mb-4">
					<div className="flex gap-2">
						<Input
							type="text"
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							placeholder="O que você está procurando?"
							className="flex-1"
						/>
						<Button type="submit">Buscar</Button>
					</div>
				</form>

				{searchQuery && (
					<div className="flex items-center justify-between">
						<h1 className="font-bold text-2xl text-gray-900">
							Resultados para "{searchQuery}"
						</h1>
						<div className="flex items-center gap-4">
							<p className="text-gray-600">
								{searchResults?.totalCount || 0} serviços encontrados
							</p>
							{/* Sort Dropdown */}
							<Select
								value={sortBy}
								onValueChange={(value: typeof sortBy) => setSortBy(value)}
							>
								<SelectTrigger className="w-48">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="relevance">Mais Relevantes</SelectItem>
									<SelectItem value="rating">Melhor Avaliação</SelectItem>
									<SelectItem value="price_asc">Menor Preço</SelectItem>
									<SelectItem value="price_desc">Maior Preço</SelectItem>
									<SelectItem value="newest">Mais Recentes</SelectItem>
								</SelectContent>
							</Select>
							<div className="flex rounded-lg border bg-white p-1">
								<Button
									variant={viewMode === "grid" ? "default" : "ghost"}
									size="sm"
									onClick={() => setViewMode("grid")}
									className="flex items-center gap-2"
								>
									<Grid className="h-4 w-4" />
									Grade
								</Button>
								<Button
									variant={viewMode === "map" ? "default" : "ghost"}
									size="sm"
									onClick={() => setViewMode("map")}
									className="flex items-center gap-2"
								>
									<MapIcon className="h-4 w-4" />
									Mapa
								</Button>
							</div>
						</div>
					</div>
				)}
			</div>

			<div className="flex gap-8">
				{/* Desktop Filters Sidebar */}
				<aside className="hidden w-80 lg:block">
					<div className="sticky top-4">
						<Card>
							<CardContent className="p-6">
								<h2 className="mb-4 font-semibold text-lg">Filtros</h2>
								<FiltersContent />
							</CardContent>
						</Card>
					</div>
				</aside>

				{/* Main Content */}
				<div className="flex-1">
					{/* Mobile Filters */}
					<div className="mb-4 lg:hidden">
						<Sheet>
							<SheetTrigger asChild>
								<Button variant="outline" className="w-full">
									<Filter className="mr-2 h-4 w-4" />
									Filtros
								</Button>
							</SheetTrigger>
							<SheetContent side="left" className="w-80">
								<div className="py-6">
									<h2 className="mb-4 font-semibold text-lg">Filtros</h2>
									<FiltersContent />
								</div>
							</SheetContent>
						</Sheet>
					</div>
					{isLoading ? (
						<div className="grid gap-6 md:grid-cols-2">
							{[0, 1, 2, 3, 4, 5].map((num) => (
								<Card key={`loading-card-${num}`} className="animate-pulse">
									<div className="aspect-video bg-gray-200" />
									<CardContent className="p-4">
										<div className="mb-2 h-4 rounded bg-gray-200" />
										<div className="mb-2 h-3 w-3/4 rounded bg-gray-200" />
										<div className="h-3 w-1/2 rounded bg-gray-200" />
									</CardContent>
								</Card>
							))}
						</div>
					) : null}
					{!isLoading &&
					searchResults?.services &&
					Array.isArray(searchResults.services) &&
					searchResults.services.length > 0 ? (
						viewMode === "map" ? (
							<MapView
								services={searchResults.services}
								center={{ lat: -23.5505, lng: -46.6333 }}
							/>
						) : (
							<div className="grid gap-6 md:grid-cols-2">
								{searchResults.services.map((service) => (
									<Link key={service.id} href={`/services/${service.id}`}>
										<Card className="group hover:-translate-y-1 transition-all hover:shadow-lg">
											<div className="relative aspect-video overflow-hidden rounded-t-lg">
												{service.images?.[0] ? (
													<Image
														src={service.images[0].url}
														alt={service.title}
														fill
														className="object-cover transition-transform group-hover:scale-105"
													/>
												) : (
													<div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-100 to-indigo-100">
														<span className="font-semibold text-2xl text-indigo-600">
															{service.category.name.charAt(0)}
														</span>
													</div>
												)}
												<div className="absolute top-2 right-2 rounded-full bg-white px-2 py-1 font-medium text-gray-900 text-sm shadow-sm">
													R$ {service.price.toFixed(2)}
													{service.priceType === "hourly" && "/h"}
												</div>
											</div>

											<CardContent className="p-6">
												<div className="mb-2 flex items-center justify-between">
													<span className="rounded-full bg-blue-100 px-2 py-1 font-medium text-blue-800 text-xs">
														{service.category.name}
													</span>
													<div className="flex items-center space-x-1">
														<Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
														<span className="font-medium text-sm">
															{service.avgRating?.toFixed(1) || "5.0"}
														</span>
													</div>
												</div>

												<h3 className="mb-2 line-clamp-2 font-semibold text-gray-900 text-lg">
													{service.title}
												</h3>

												<p className="mb-4 line-clamp-2 text-gray-600 text-sm">
													{service.description}
												</p>

												<div className="flex items-center justify-between">
													<div className="flex items-center space-x-2">
														{service.provider.image ? (
															<Image
																src={service.provider.image}
																alt={service.provider.name || ""}
																width={32}
																height={32}
																className="rounded-full"
															/>
														) : (
															<div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200">
																<span className="font-medium text-gray-600 text-xs">
																	{service.provider.name?.charAt(0) || "?"}
																</span>
															</div>
														)}
														<span className="font-medium text-gray-900 text-sm">
															{service.provider.name}
														</span>
													</div>

													{service.location && (
														<div className="flex items-center space-x-1 text-gray-500">
															<MapPin className="h-4 w-4" />
															<span className="text-xs">
																{service.location.split(",")[0]}
															</span>
														</div>
													)}
												</div>
											</CardContent>
										</Card>
									</Link>
								))}
							</div>
						)
					) : null}
					{/* No Results */}
					{!isLoading &&
					searchResults?.services &&
					Array.isArray(searchResults.services) &&
					searchResults.services.length === 0 ? (
						<div className="py-12 text-center">
							<h3 className="mb-2 font-semibold text-gray-900 text-lg">
								Nenhum serviço encontrado
							</h3>
							<p className="text-gray-600">
								Tente ajustar seus filtros ou usar palavras-chave diferentes.
							</p>
						</div>
					) : null}
				</div>
			</div>
		</div>
	);
}
