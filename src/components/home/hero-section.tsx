"use client";

import {
	CalendarIcon,
	MagnifyingGlassIcon,
	MapPinIcon,
} from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { api } from "~/trpc/react";

export function HeroSection() {
	const [searchQuery, setSearchQuery] = useState("");
	const [location, setLocation] = useState("");
	const [showSuggestions, setShowSuggestions] = useState(false);
	const [animatedText, setAnimatedText] = useState("Profissionais");
	const router = useRouter();

	const { data: categories } = api.category.list.useQuery({});

	// Animated text rotation effect
	useEffect(() => {
		const texts = ["Profissionais", "Especialistas", "Técnicos", "Prestadores"];
		let currentIndex = 0;

		const interval = setInterval(() => {
			currentIndex = (currentIndex + 1) % texts.length;
			const newText = texts[currentIndex];
			if (newText) {
				setAnimatedText(newText);
			}
		}, 3000);

		return () => clearInterval(interval);
	}, []);

	const handleSearch = (e: React.FormEvent) => {
		e.preventDefault();
		const params = new URLSearchParams();
		if (searchQuery.trim()) params.set("q", searchQuery.trim());
		if (location.trim()) params.set("location", location.trim());

		router.push(`/search?${params.toString()}`);
	};

	const handleQuickSearch = (tag: string) => {
		setSearchQuery(tag);
		setShowSuggestions(false);
		router.push(`/search?q=${encodeURIComponent(tag)}`);
	};

	// Get user's location
	const getLocation = () => {
		if (navigator.geolocation) {
			navigator.geolocation.getCurrentPosition(
				(position) => {
					const { latitude, longitude } = position.coords;
					// In a real app, you'd reverse geocode these coordinates
					setLocation(`${latitude.toFixed(2)}, ${longitude.toFixed(2)}`);
				},
				(error) => {
					console.log("Error getting location:", error);
				},
			);
		}
	};

	return (
		<section className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-20 lg:py-32">
			<div className="container relative mx-auto px-4">
				<div className="mx-auto max-w-4xl text-center">
					{/* Animated Headlines */}
					<div className="mb-8">
						<h1 className="mb-4 font-bold text-4xl text-gray-900 leading-tight md:text-6xl lg:text-7xl">
							Encontre
							<span className="block bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent transition-all duration-1000">
								{animatedText}
							</span>
							de Confiança
						</h1>
						<p className="mx-auto max-w-2xl text-gray-600 text-xl md:text-2xl">
							Conecte-se com especialistas locais para todos os seus projetos.
							<span className="mt-2 block font-medium text-indigo-600 text-lg">
								Mais de 1000+ profissionais verificados
							</span>
						</p>
					</div>

					{/* Enhanced Search Bar */}
					<form onSubmit={handleSearch} className="mx-auto mb-8 max-w-4xl">
						<div className="rounded-2xl border border-gray-100 bg-white p-2 shadow-2xl">
							<div className="flex flex-col gap-2 md:flex-row">
								{/* Search Input */}
								<div className="relative flex-1">
									<MagnifyingGlassIcon className="-translate-y-1/2 absolute top-1/2 left-4 h-5 w-5 transform text-gray-400" />
									<Input
										type="text"
										value={searchQuery}
										onChange={(e) => {
											setSearchQuery(e.target.value);
											setShowSuggestions(e.target.value.length > 0);
										}}
										onFocus={() => setShowSuggestions(searchQuery.length > 0)}
										onBlur={() =>
											setTimeout(() => setShowSuggestions(false), 200)
										}
										placeholder="O que você está procurando?"
										className="rounded-xl border-0 py-4 pl-12 text-lg focus-visible:ring-2 focus-visible:ring-indigo-500"
									/>

									{/* Search Suggestions */}
									{showSuggestions && searchQuery && (
										<div className="absolute top-full right-0 left-0 z-10 mt-1 max-h-40 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
											{categories
												?.filter((cat) =>
													cat.name
														.toLowerCase()
														.includes(searchQuery.toLowerCase()),
												)
												.slice(0, 5)
												.map((category) => (
													<button
														key={category.id}
														type="button"
														onClick={() => handleQuickSearch(category.name)}
														className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50"
													>
														{category.name}
													</button>
												))}
										</div>
									)}
								</div>

								{/* Location Input */}
								<div className="relative flex-1">
									<MapPinIcon className="-translate-y-1/2 absolute top-1/2 left-4 h-5 w-5 transform text-gray-400" />
									<Input
										type="text"
										value={location}
										onChange={(e) => setLocation(e.target.value)}
										placeholder="Onde você está?"
										className="rounded-xl border-0 py-4 pl-12 text-lg focus-visible:ring-2 focus-visible:ring-indigo-500"
									/>
									<button
										type="button"
										onClick={getLocation}
										className="-translate-y-1/2 absolute top-1/2 right-2 transform p-2 text-indigo-600 hover:text-indigo-700"
										title="Usar minha localização"
									>
										<MapPinIcon className="h-4 w-4" />
									</button>
								</div>

								{/* Search Button */}
								<Button
									type="submit"
									size="lg"
									className="rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-4 text-lg shadow-lg hover:from-indigo-700 hover:to-purple-700"
								>
									Buscar
								</Button>
							</div>
						</div>
					</form>

					{/* Enhanced Quick Search Tags */}
					<div className="mb-8 space-y-4">
						<p className="font-medium text-gray-600">Categorias populares:</p>
						<div className="flex flex-wrap justify-center gap-3">
							{[
								{ name: "Limpeza", icon: "🧹" },
								{ name: "Eletricista", icon: "⚡" },
								{ name: "Encanador", icon: "🔧" },
								{ name: "Pintor", icon: "🎨" },
								{ name: "Jardinagem", icon: "🌱" },
								{ name: "Montagem", icon: "🔨" },
							].map((tag) => (
								<Button
									key={tag.name}
									variant="secondary"
									size="sm"
									onClick={() => handleQuickSearch(tag.name)}
									className="rounded-full border border-gray-200 bg-white transition-transform hover:scale-105 hover:border-indigo-200 hover:bg-indigo-50"
								>
									<span className="mr-2">{tag.icon}</span>
									{tag.name}
								</Button>
							))}
						</div>
					</div>

					{/* Enhanced CTA Buttons */}
					<div className="flex flex-col space-y-4 sm:flex-row sm:justify-center sm:space-x-6 sm:space-y-0">
						<Button
							size="lg"
							onClick={() => router.push("/search")}
							className="rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-4 text-lg shadow-lg transition-all hover:scale-105 hover:from-indigo-700 hover:to-purple-700 hover:shadow-xl"
						>
							<MagnifyingGlassIcon className="mr-2 h-5 w-5" />
							Encontrar Serviços
						</Button>
						<Button
							variant="outline"
							size="lg"
							onClick={() => router.push("/become-professional")}
							className="rounded-xl border-2 border-indigo-600 px-8 py-4 text-indigo-600 text-lg shadow-lg transition-all hover:scale-105 hover:bg-indigo-600 hover:text-white hover:shadow-xl"
						>
							<CalendarIcon className="mr-2 h-5 w-5" />
							Oferecer Serviços
						</Button>
					</div>

					{/* Trust Indicators */}
					<div className="mt-12 grid grid-cols-1 gap-6 text-center md:grid-cols-3">
						<div className="space-y-2">
							<div className="font-bold text-3xl text-indigo-600">1000+</div>
							<div className="text-gray-600">Profissionais Ativos</div>
						</div>
						<div className="space-y-2">
							<div className="font-bold text-3xl text-indigo-600">50k+</div>
							<div className="text-gray-600">Serviços Realizados</div>
						</div>
						<div className="space-y-2">
							<div className="font-bold text-3xl text-indigo-600">4.9★</div>
							<div className="text-gray-600">Avaliação Média</div>
						</div>
					</div>
				</div>
			</div>

			{/* Enhanced Background Effects */}
			<div className="-z-10 absolute inset-0 overflow-hidden">
				{/* Gradient Orbs */}
				<div className="absolute top-20 left-10 h-72 w-72 animate-pulse rounded-full bg-gradient-to-r from-blue-300 to-indigo-300 opacity-20 blur-3xl" />
				<div className="absolute right-10 bottom-20 h-96 w-96 animate-pulse rounded-full bg-gradient-to-r from-purple-300 to-pink-300 opacity-20 blur-3xl delay-1000" />

				{/* Grid Pattern */}
				<svg
					className="-translate-x-1/2 absolute top-0 left-1/2 h-full w-full transform stroke-gray-200/30"
					aria-hidden="true"
				>
					<defs>
						<pattern
							id="hero-grid"
							width={40}
							height={40}
							patternUnits="userSpaceOnUse"
						>
							<path d="M0 40V0h40" fill="none" strokeWidth="1" />
						</pattern>
					</defs>
					<rect width="100%" height="100%" fill="url(#hero-grid)" />
				</svg>
			</div>
		</section>
	);
}
