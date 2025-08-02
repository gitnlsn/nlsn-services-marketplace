"use client";

import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "~/components/ui/button";

export function HeroSection() {
	const [searchQuery, setSearchQuery] = useState("");
	const router = useRouter();

	const handleSearch = (e: React.FormEvent) => {
		e.preventDefault();
		if (searchQuery.trim()) {
			router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
		}
	};

	return (
		<section className="relative bg-gradient-to-br from-blue-50 to-indigo-100 py-20">
			<div className="container mx-auto px-4">
				<div className="text-center">
					<h1 className="mb-6 font-bold text-4xl text-gray-900 md:text-6xl">
						Encontre Profissionais de
						<span className="block text-indigo-600">Confiança</span>
					</h1>
					<p className="mb-8 text-gray-600 text-xl md:text-2xl">
						Conecte-se com especialistas locais para todos os seus projetos
					</p>

					{/* Search Bar */}
					<form onSubmit={handleSearch} className="mx-auto mb-8 max-w-2xl">
						<div className="relative">
							<input
								type="text"
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								placeholder="O que você está procurando? (ex: eletricista, limpeza, pintor...)"
								className="w-full rounded-full border-0 py-4 pr-16 pl-6 text-lg shadow-lg ring-1 ring-gray-300 focus:ring-2 focus:ring-indigo-500"
							/>
							<button
								type="submit"
								className="absolute top-2 right-2 rounded-full bg-indigo-600 p-2 text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
							>
								<MagnifyingGlassIcon className="h-6 w-6" />
							</button>
						</div>
					</form>

					{/* Quick Search Tags */}
					<div className="mb-8 flex flex-wrap justify-center gap-2">
						{[
							"Limpeza",
							"Eletricista",
							"Encanador",
							"Pintor",
							"Jardinagem",
							"Montagem",
						].map((tag) => (
							<Button
								key={tag}
								variant="secondary"
								size="sm"
								onClick={() => setSearchQuery(tag)}
								className="rounded-full"
							>
								{tag}
							</Button>
						))}
					</div>

					{/* CTA Buttons */}
					<div className="flex flex-col space-y-4 sm:flex-row sm:justify-center sm:space-x-4 sm:space-y-0">
						<Button
							size="lg"
							onClick={() => router.push("/search")}
							className="px-8 text-lg"
						>
							Encontrar Serviços
						</Button>
						<Button
							variant="outline"
							size="lg"
							onClick={() => router.push("/become-professional")}
							className="px-8 text-lg"
						>
							Oferecer Serviços
						</Button>
					</div>
				</div>
			</div>

			{/* Background Pattern */}
			<div className="-z-10 absolute inset-0 overflow-hidden">
				<svg
					className="-translate-x-1/2 absolute top-0 left-[max(50%,25rem)] h-[64rem] w-[128rem] stroke-gray-200 [mask-image:radial-gradient(64rem_64rem_at_top,white,transparent)]"
					aria-hidden="true"
				>
					<defs>
						<pattern
							id="e813992c-7d03-4cc4-a2bd-151760b470a0"
							width={200}
							height={200}
							x="50%"
							y={-1}
							patternUnits="userSpaceOnUse"
						>
							<path d="M100 200V.5M.5 .5H200" fill="none" />
						</pattern>
					</defs>
					<rect
						width="100%"
						height="100%"
						strokeWidth={0}
						fill="url(#e813992c-7d03-4cc4-a2bd-151760b470a0)"
					/>
				</svg>
			</div>
		</section>
	);
}
