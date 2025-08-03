"use client";

import { ChevronLeft, ChevronRight, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { api } from "~/trpc/react";

export function FeaturedServices() {
	const scrollRef = useRef<HTMLDivElement>(null);
	const autoPlayRef = useRef<NodeJS.Timeout | null>(null);
	const [canScrollLeft, setCanScrollLeft] = useState(false);
	const [canScrollRight, setCanScrollRight] = useState(true);
	const [isHovered, setIsHovered] = useState(false);

	const { data: featuredServices, isLoading } =
		api.search.searchServices.useQuery({
			query: "serviços",
			limit: 8,
		});

	const checkScrollButtons = () => {
		if (scrollRef.current) {
			const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
			setCanScrollLeft(scrollLeft > 0);
			setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
		}
	};

	const scrollLeft = useCallback(() => {
		if (scrollRef.current) {
			scrollRef.current.scrollBy({ left: -320, behavior: "smooth" });
		}
	}, []);

	const scrollRight = useCallback(() => {
		if (scrollRef.current) {
			scrollRef.current.scrollBy({ left: 320, behavior: "smooth" });
		}
	}, []);

	const startAutoPlay = useCallback(() => {
		if (autoPlayRef.current) clearInterval(autoPlayRef.current);
		autoPlayRef.current = setInterval(() => {
			if (!isHovered && scrollRef.current) {
				const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
				if (scrollLeft >= scrollWidth - clientWidth - 1) {
					// Reset to beginning
					scrollRef.current.scrollTo({ left: 0, behavior: "smooth" });
				} else {
					scrollRight();
				}
			}
		}, 4000);
	}, [isHovered, scrollRight]);

	const stopAutoPlay = useCallback(() => {
		if (autoPlayRef.current) {
			clearInterval(autoPlayRef.current);
			autoPlayRef.current = null;
		}
	}, []);

	// Auto-play effect
	useEffect(() => {
		if (
			featuredServices?.services &&
			Array.isArray(featuredServices.services) &&
			featuredServices.services.length > 3
		) {
			startAutoPlay();
		}
		return () => stopAutoPlay();
	}, [featuredServices, startAutoPlay, stopAutoPlay]);

	// Handle mouse enter/leave for pause on hover
	const handleMouseEnter = () => {
		setIsHovered(true);
		stopAutoPlay();
	};

	const handleMouseLeave = () => {
		setIsHovered(false);
		if (
			featuredServices?.services &&
			Array.isArray(featuredServices.services) &&
			featuredServices.services.length > 3
		) {
			startAutoPlay();
		}
	};

	if (isLoading) {
		return (
			<section className="py-16">
				<div className="container mx-auto px-4">
					<h2 className="mb-8 text-center font-bold text-3xl">
						Serviços em Destaque
					</h2>
					<div className="flex gap-6 overflow-hidden">
						{Array.from({ length: 6 }, () => (
							<Card
								key={crypto.randomUUID()}
								className="min-w-80 flex-shrink-0 animate-pulse"
							>
								<div className="aspect-video bg-gray-200" />
								<CardContent className="p-4">
									<div className="mb-2 h-4 rounded bg-gray-200" />
									<div className="mb-2 h-3 w-3/4 rounded bg-gray-200" />
									<div className="h-3 w-1/2 rounded bg-gray-200" />
								</CardContent>
							</Card>
						))}
					</div>
				</div>
			</section>
		);
	}

	if (
		!featuredServices?.services ||
		!Array.isArray(featuredServices.services) ||
		featuredServices.services.length === 0
	) {
		return null;
	}

	return (
		<section className="bg-gray-50 py-16">
			<div className="container mx-auto px-4">
				<div className="mb-12 text-center">
					<h2 className="mb-4 font-bold text-3xl text-gray-900">
						Serviços em Destaque
					</h2>
					<p className="text-gray-600 text-lg">
						Os profissionais mais bem avaliados da nossa plataforma
					</p>
				</div>

				<div className="relative">
					{/* Navigation Buttons */}
					{canScrollLeft && (
						<Button
							variant="outline"
							size="icon"
							className="-left-4 -translate-y-1/2 absolute top-1/2 z-10 rounded-full bg-white shadow-lg"
							onClick={scrollLeft}
						>
							<ChevronLeft className="h-4 w-4" />
						</Button>
					)}
					{canScrollRight && (
						<Button
							variant="outline"
							size="icon"
							className="-right-4 -translate-y-1/2 absolute top-1/2 z-10 rounded-full bg-white shadow-lg"
							onClick={scrollRight}
						>
							<ChevronRight className="h-4 w-4" />
						</Button>
					)}

					{/* Horizontal Scrolling Container */}
					<div
						ref={scrollRef}
						className="flex gap-6 overflow-x-auto scroll-smooth pb-4 [&::-webkit-scrollbar]:hidden"
						style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
						onScroll={checkScrollButtons}
						onMouseEnter={handleMouseEnter}
						onMouseLeave={handleMouseLeave}
					>
						{featuredServices.services.map((service) => (
							<Card
								key={service.id}
								className="group hover:-translate-y-1 min-w-80 flex-shrink-0 transition-all hover:shadow-lg"
							>
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

									<div className="mb-4 flex items-center space-x-2">
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

									<Link href={`/services/${service.id}`}>
										<Button className="w-full">Ver Detalhes</Button>
									</Link>
								</CardContent>
							</Card>
						))}
					</div>
				</div>

				<div className="mt-12 text-center">
					<Link href="/search">
						<Button variant="outline" size="lg" className="px-8">
							Ver Todos os Serviços
						</Button>
					</Link>
				</div>
			</div>
		</section>
	);
}
