"use client";

import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import { MapPinIcon, StarIcon } from "@heroicons/react/24/solid";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";

// Mock data - in real app this would come from tRPC
const featuredProfessionals = [
	{
		id: "1",
		name: "Carlos Silva",
		profession: "Eletricista",
		image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
		rating: 4.9,
		reviewCount: 127,
		location: "Vila Madalena, SP",
		price: "A partir de R$ 80",
		verified: true,
	},
	{
		id: "2",
		name: "Maria Santos",
		profession: "Diarista",
		image: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150",
		rating: 5.0,
		reviewCount: 89,
		location: "Copacabana, RJ",
		price: "A partir de R$ 60",
		verified: true,
	},
	{
		id: "3",
		name: "João Pereira",
		profession: "Pintor",
		image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150",
		rating: 4.8,
		reviewCount: 156,
		location: "Jardins, SP",
		price: "A partir de R$ 120",
		verified: true,
	},
	{
		id: "4",
		name: "Ana Costa",
		profession: "Jardineira",
		image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150",
		rating: 4.9,
		reviewCount: 93,
		location: "Barra da Tijuca, RJ",
		price: "A partir de R$ 90",
		verified: true,
	},
	{
		id: "5",
		name: "Pedro Oliveira",
		profession: "Encanador",
		image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150",
		rating: 4.7,
		reviewCount: 78,
		location: "Moema, SP",
		price: "A partir de R$ 100",
		verified: true,
	},
];

export function FeaturedProfessionals() {
	const router = useRouter();
	const [currentIndex, setCurrentIndex] = useState(0);

	const nextSlide = () => {
		setCurrentIndex((prev) =>
			prev + 1 >= featuredProfessionals.length - 2 ? 0 : prev + 1,
		);
	};

	const prevSlide = () => {
		setCurrentIndex((prev) =>
			prev === 0 ? featuredProfessionals.length - 3 : prev - 1,
		);
	};

	const handleProfessionalClick = (professionalId: string) => {
		router.push(`/professional/${professionalId}`);
	};

	return (
		<section className="bg-gray-50 py-16">
			<div className="container mx-auto px-4">
				<div className="text-center">
					<h2 className="mb-4 font-bold text-3xl text-gray-900">
						Profissionais em Destaque
					</h2>
					<p className="mb-12 text-gray-600 text-lg">
						Conheça alguns dos nossos melhores avaliados
					</p>
				</div>

				<div className="relative">
					{/* Navigation Buttons */}
					<Button
						variant="outline"
						size="icon"
						onClick={prevSlide}
						className="-translate-y-1/2 md:-left-4 absolute top-1/2 left-0 z-10 rounded-full bg-white shadow-lg"
					>
						<ChevronLeftIcon className="h-6 w-6" />
					</Button>
					<Button
						variant="outline"
						size="icon"
						onClick={nextSlide}
						className="-translate-y-1/2 md:-right-4 absolute top-1/2 right-0 z-10 rounded-full bg-white shadow-lg"
					>
						<ChevronRightIcon className="h-6 w-6" />
					</Button>

					{/* Carousel */}
					<div className="overflow-hidden">
						<div
							className="flex transition-transform duration-300 ease-in-out"
							style={{
								transform: `translateX(-${currentIndex * (100 / 3)}%)`,
							}}
						>
							{featuredProfessionals.map((professional) => (
								<div
									key={professional.id}
									className="w-full flex-shrink-0 px-2 md:w-1/3"
								>
									<Card
										className="cursor-pointer transition-all hover:shadow-md"
										onClick={() => handleProfessionalClick(professional.id)}
									>
										<CardContent className="p-6 text-center">
											<div className="relative mx-auto mb-4 h-20 w-20">
												<img
													src={professional.image}
													alt={professional.name}
													className="h-20 w-20 rounded-full object-cover"
												/>
												{professional.verified && (
													<Badge
														variant="default"
														className="-bottom-1 -right-1 absolute flex h-6 w-6 items-center justify-center rounded-full bg-green-500 p-0 hover:bg-green-500"
													>
														<svg
															className="h-3 w-3 text-white"
															fill="currentColor"
															viewBox="0 0 20 20"
															role="img"
															aria-label="Verified professional"
														>
															<path
																fillRule="evenodd"
																d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
																clipRule="evenodd"
															/>
														</svg>
													</Badge>
												)}
											</div>

											<h3 className="mb-1 font-semibold text-gray-900">
												{professional.name}
											</h3>
											<p className="mb-2 text-muted-foreground text-sm">
												{professional.profession}
											</p>

											<div className="mb-2 flex items-center justify-center">
												<StarIcon className="h-4 w-4 text-yellow-400" />
												<span className="ml-1 font-medium text-gray-900 text-sm">
													{professional.rating}
												</span>
												<span className="ml-1 text-muted-foreground text-sm">
													({professional.reviewCount} avaliações)
												</span>
											</div>

											<div className="mb-2 flex items-center justify-center text-muted-foreground text-sm">
												<MapPinIcon className="h-4 w-4" />
												<span className="ml-1">{professional.location}</span>
											</div>

											<p className="font-medium text-primary text-sm">
												{professional.price}
											</p>
										</CardContent>
									</Card>
								</div>
							))}
						</div>
					</div>
				</div>

				<div className="mt-8 text-center">
					<Button variant="link" onClick={() => router.push("/professionals")}>
						Ver todos os profissionais →
					</Button>
				</div>
			</div>
		</section>
	);
}
