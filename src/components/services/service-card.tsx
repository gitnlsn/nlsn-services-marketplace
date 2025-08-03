"use client";

import Image from "next/image";
import Link from "next/link";
import { Button } from "~/components/ui/button";
import { Clock, MapPin, Star } from "~/components/ui/icon";
import { PriceDisplay } from "~/components/ui/price-display";

interface ServiceCardProps {
	service: {
		id: string;
		title: string;
		description: string;
		price: number;
		priceType: "fixed" | "hourly";
		avgRating?: number | null;
		viewCount: number;
		location?: string | null;
		provider: {
			id: string;
			name: string | null;
			image: string | null;
		};
		category: {
			name: string;
		};
		images: Array<{
			url: string;
		}>;
		_count: {
			reviews: number;
			bookings: number;
		};
	};
}

export function ServiceCard({ service }: ServiceCardProps) {
	const rating = service.avgRating || 0;
	const reviewCount = service._count.reviews;
	const imageUrl = service.images[0]?.url || "/placeholder-service.jpg";

	return (
		<div className="overflow-hidden rounded-lg bg-white shadow-md transition-shadow duration-300 hover:shadow-lg">
			{/* Image */}
			<div className="relative h-48 w-full">
				<Image
					src={imageUrl}
					alt={service.title}
					fill
					className="object-cover"
				/>
				<div className="absolute top-3 right-3 rounded-full bg-white/90 px-2 py-1 backdrop-blur-sm">
					<PriceDisplay
						amount={service.price}
						type={service.priceType}
						className="font-semibold text-gray-800 text-sm"
					/>
				</div>
			</div>

			{/* Content */}
			<div className="p-4">
				{/* Category */}
				<div className="mb-2">
					<span className="inline-block rounded-full bg-indigo-100 px-2 py-1 font-medium text-indigo-800 text-xs">
						{service.category.name}
					</span>
				</div>

				{/* Title */}
				<h3 className="mb-2 line-clamp-2 font-semibold text-gray-900 text-lg">
					{service.title}
				</h3>

				{/* Description */}
				<p className="mb-3 line-clamp-2 text-gray-600 text-sm">
					{service.description}
				</p>

				{/* Location */}
				{service.location && (
					<div className="mb-3 flex items-center text-gray-500 text-sm">
						<MapPin className="mr-1 h-4 w-4" />
						<span className="truncate">{service.location}</span>
					</div>
				)}

				{/* Provider */}
				<div className="mb-3 flex items-center">
					<div className="relative mr-2 h-8 w-8 overflow-hidden rounded-full">
						<Image
							src={service.provider.image || "/placeholder-avatar.jpg"}
							alt={service.provider.name || "Provider"}
							fill
							className="object-cover"
						/>
					</div>
					<span className="font-medium text-gray-700 text-sm">
						{service.provider.name || "Professional"}
					</span>
				</div>

				{/* Rating and Stats */}
				<div className="mb-4 flex items-center justify-between">
					<div className="flex items-center">
						<div className="mr-2 flex items-center">
							{[1, 2, 3, 4, 5].map((star) => (
								<div key={star}>
									{star <= Math.floor(rating) ? (
										<Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
									) : (
										<Star className="h-4 w-4 text-gray-300" />
									)}
								</div>
							))}
						</div>
						<span className="text-gray-600 text-sm">
							{rating.toFixed(1)} ({reviewCount} avaliações)
						</span>
					</div>
				</div>

				{/* Action Button */}
				<Button asChild variant="brand" className="w-full">
					<Link href={`/services/${service.id}`}>Ver Detalhes</Link>
				</Button>
			</div>
		</div>
	);
}
