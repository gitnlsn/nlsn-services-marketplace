"use client";

import L from "leaflet";
import { MapPin, Star, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { api } from "~/trpc/react";

// Fix for default markers in react-leaflet
(
	L.Icon.Default.prototype as L.Icon.Default & { _getIconUrl?: () => void }
)._getIconUrl = undefined;
L.Icon.Default.mergeOptions({
	iconRetinaUrl:
		"https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
	iconUrl:
		"https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
	shadowUrl:
		"https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

interface Service {
	id: string;
	title: string;
	description: string;
	price: number;
	priceType: string;
	location?: string;
	images?: Array<{ url: string }>;
	avgRating?: number;
	category: { name: string };
	provider: { name?: string; image?: string };
}

interface MapViewProps {
	services: Service[];
	center?: { lat: number; lng: number };
	zoom?: number;
}

// Component to fit map bounds to markers
function SetViewOnBounds({
	services,
}: {
	services: Array<Service & { coordinates: { lat: number; lng: number } }>;
}) {
	const map = useMap();

	useEffect(() => {
		if (services.length === 0) return;

		const validCoords = services.filter(
			(s) =>
				s.coordinates &&
				!Number.isNaN(s.coordinates.lat) &&
				!Number.isNaN(s.coordinates.lng),
		);

		if (validCoords.length === 0) return;

		// Fit map to bounds of all markers
		const bounds = L.latLngBounds(
			validCoords.map((s) => [s.coordinates.lat, s.coordinates.lng]),
		);

		// Only adjust if we have multiple services or custom center not provided
		if (services.length > 1) {
			map.fitBounds(bounds, { padding: [20, 20] });
		}
	}, [map, services]);

	return null;
}

// Create custom icons
const createCustomIcon = (isSelected: boolean) => {
	const iconColor = isSelected ? "#ef4444" : "#3b82f6"; // red-500 : blue-500
	const svgIcon = `
		<svg width="25" height="35" viewBox="0 0 25 35" xmlns="http://www.w3.org/2000/svg">
			<path d="M12.5 0C5.596 0 0 5.596 0 12.5c0 12.5 12.5 22.5 12.5 22.5s12.5-10 12.5-22.5C25 5.596 19.404 0 12.5 0z" fill="${iconColor}"/>
			<circle cx="12.5" cy="12.5" r="6" fill="white"/>
			<path d="M9 12l2 2 4-4" stroke="${iconColor}" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
		</svg>
	`;

	return L.divIcon({
		html: svgIcon,
		iconSize: [25, 35],
		iconAnchor: [12.5, 35],
		popupAnchor: [0, -35],
		className: "custom-marker-icon",
	});
};

export function MapViewClient({ services, center, zoom = 12 }: MapViewProps) {
	const [selectedService, setSelectedService] = useState<Service | null>(null);
	const mapCenter = center || { lat: -23.5505, lng: -46.6333 }; // São Paulo default

	// Get unique locations for batch geocoding
	const uniqueLocations = useMemo(() => {
		const locations = services
			.map((service) => service.location)
			.filter((location): location is string => Boolean(location));
		return [...new Set(locations)];
	}, [services]);

	// Batch geocode all unique locations
	const {
		data: geocodingResults,
		isLoading: isGeocodingLoading,
		error: geocodingError,
	} = api.geocoding.batchGeocode.useQuery(
		{ addresses: uniqueLocations },
		{
			enabled: uniqueLocations.length > 0,
			staleTime: 1000 * 60 * 60, // Cache for 1 hour
			retry: 2,
		},
	);

	// Generate coordinates for services using real geocoding when available
	const servicesWithCoords = useMemo(() => {
		// Create a lookup map for geocoded results
		const geocodingMap = new Map<string, { lat: number; lng: number }>();
		if (geocodingResults) {
			uniqueLocations.forEach((location, index) => {
				const result = geocodingResults[index];
				if (result) {
					geocodingMap.set(location, result.coordinates);
				}
			});
		}

		return services.map((service, index) => {
			let coordinates: { lat: number; lng: number };

			if (service.location && geocodingMap.has(service.location)) {
				// Use real geocoded coordinates
				const geocoded = geocodingMap.get(service.location);
				if (geocoded) {
					coordinates = geocoded;
				} else {
					// Fallback if geocoding somehow failed
					coordinates = {
						lat: mapCenter.lat + ((index % 7) - 3) * 0.008,
						lng: mapCenter.lng + ((Math.floor(index / 7) % 5) - 2) * 0.008,
					};
				}
			} else if (service.location) {
				// Fallback to deterministic positioning based on location string
				const locationHash = service.location.split("").reduce((acc, char) => {
					const newAcc = (acc << 5) - acc + char.charCodeAt(0);
					return newAcc & newAcc;
				}, 0);
				coordinates = {
					lat: mapCenter.lat + ((locationHash % 1000) / 1000 - 0.5) * 0.05,
					lng:
						mapCenter.lng + (((locationHash * 7) % 1000) / 1000 - 0.5) * 0.05,
				};
			} else {
				// Use index for consistent positioning when no location
				coordinates = {
					lat: mapCenter.lat + ((index % 7) - 3) * 0.008,
					lng: mapCenter.lng + ((Math.floor(index / 7) % 5) - 2) * 0.008,
				};
			}

			return {
				...service,
				coordinates,
			};
		});
	}, [services, mapCenter, geocodingResults, uniqueLocations]);

	// Show geocoding loading state if we have locations to geocode
	if (isGeocodingLoading && uniqueLocations.length > 0) {
		return (
			<div className="flex h-96 w-full items-center justify-center rounded-lg border bg-gray-100">
				<div className="text-center">
					<MapPin className="mx-auto mb-2 h-8 w-8 animate-pulse text-blue-500" />
					<p className="text-gray-500">Carregando localizações...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="relative h-96 w-full overflow-hidden rounded-lg border">
			<MapContainer
				center={mapCenter}
				zoom={zoom}
				className="h-full w-full"
				scrollWheelZoom={false}
			>
				<TileLayer
					attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
					url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
				/>
				<SetViewOnBounds services={servicesWithCoords} />

				{servicesWithCoords.map((service) => (
					<Marker
						key={service.id}
						position={[service.coordinates.lat, service.coordinates.lng]}
						icon={createCustomIcon(selectedService?.id === service.id)}
						eventHandlers={{
							click: () => setSelectedService(service),
						}}
					>
						<Popup>
							<div className="w-64">
								<div className="relative">
									{service.images?.[0] ? (
										<Image
											src={service.images[0].url}
											alt={service.title}
											width={256}
											height={128}
											className="h-32 w-full rounded-t-lg object-cover"
										/>
									) : (
										<div className="flex h-32 w-full items-center justify-center rounded-t-lg bg-gray-200">
											<MapPin className="h-8 w-8 text-gray-400" />
										</div>
									)}
								</div>
								<div className="p-3">
									<h3 className="mb-1 font-semibold text-sm">
										{service.title}
									</h3>
									<p className="mb-2 line-clamp-2 text-gray-600 text-xs">
										{service.description}
									</p>
									<div className="mb-2 flex items-center justify-between">
										<span className="font-bold text-blue-600 text-sm">
											R$ {service.price.toFixed(2)}
											{service.priceType === "HOURLY" && "/h"}
										</span>
										{service.avgRating && (
											<div className="flex items-center gap-1">
												<Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
												<span className="text-xs">
													{service.avgRating.toFixed(1)}
												</span>
											</div>
										)}
									</div>
									<Link href={`/services/${service.id}`}>
										<Button size="sm" className="w-full">
											Ver Detalhes
										</Button>
									</Link>
								</div>
							</div>
						</Popup>
					</Marker>
				))}
			</MapContainer>

			{/* Selected Service Card Overlay */}
			{selectedService && (
				<div className="absolute right-4 bottom-4 left-4 z-[1000]">
					<Card className="shadow-lg">
						<CardContent className="relative p-4">
							<button
								type="button"
								onClick={() => setSelectedService(null)}
								className="absolute top-2 right-2 rounded-full bg-white p-1 shadow-md transition-colors hover:bg-gray-100"
								aria-label="Fechar"
							>
								<X className="h-4 w-4" />
							</button>
							<div className="flex gap-4">
								{selectedService.images?.[0] ? (
									<Image
										src={selectedService.images[0].url}
										alt={selectedService.title}
										width={80}
										height={80}
										className="h-20 w-20 rounded-lg object-cover"
									/>
								) : (
									<div className="flex h-20 w-20 items-center justify-center rounded-lg bg-gray-200">
										<MapPin className="h-6 w-6 text-gray-400" />
									</div>
								)}
								<div className="flex-1">
									<h3 className="mb-1 font-semibold">
										{selectedService.title}
									</h3>
									<p className="mb-2 line-clamp-2 text-gray-600 text-sm">
										{selectedService.description}
									</p>
									<div className="flex items-center justify-between">
										<span className="font-bold text-blue-600">
											R$ {selectedService.price.toFixed(2)}
											{selectedService.priceType === "HOURLY" && "/h"}
										</span>
										<Link href={`/services/${selectedService.id}`}>
											<Button size="sm">Ver Detalhes</Button>
										</Link>
									</div>
								</div>
							</div>
						</CardContent>
					</Card>
				</div>
			)}
		</div>
	);
}
