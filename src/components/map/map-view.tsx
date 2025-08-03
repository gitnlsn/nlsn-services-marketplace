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
		if (services.length > 0) {
			const bounds = L.latLngBounds(
				services.map((service) => [
					service.coordinates.lat,
					service.coordinates.lng,
				]),
			);
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

export function MapView({ services, center, zoom = 12 }: MapViewProps) {
	const [selectedService, setSelectedService] = useState<Service | null>(null);
	const mapCenter = center || { lat: -23.5505, lng: -46.6333 }; // São Paulo default
	const [isClient, setIsClient] = useState(false);

	useEffect(() => {
		setIsClient(true);
	}, []);

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

	// Don't render on server side
	if (!isClient) {
		return (
			<div className="flex h-96 w-full items-center justify-center rounded-lg border bg-gray-100">
				<div className="text-center">
					<MapPin className="mx-auto mb-2 h-8 w-8 text-gray-400" />
					<p className="text-gray-500">Carregando mapa...</p>
				</div>
			</div>
		);
	}

	// Show geocoding loading state if we have locations to geocode
	if (isGeocodingLoading && uniqueLocations.length > 0) {
		return (
			<div className="flex h-96 w-full items-center justify-center rounded-lg border bg-gray-100">
				<div className="text-center">
					<MapPin className="mx-auto mb-2 h-8 w-8 animate-pulse text-blue-500" />
					<p className="text-gray-600">Localizando serviços...</p>
					<p className="mt-1 text-gray-500 text-sm">
						Processando {uniqueLocations.length} localizações
					</p>
				</div>
			</div>
		);
	}

	// Calculate geocoding statistics for info display
	const geocodingStats = useMemo(() => {
		if (!geocodingResults) return { total: 0, geocoded: 0, fallback: 0 };

		const total = uniqueLocations.length;
		const geocoded = geocodingResults.filter(
			(result) => result !== null,
		).length;
		const fallback = total - geocoded;

		return { total, geocoded, fallback };
	}, [geocodingResults, uniqueLocations]);

	return (
		<div className="relative h-96 w-full overflow-hidden rounded-lg border">
			{/* Geocoding Status Indicator */}
			{uniqueLocations.length > 0 && geocodingResults && (
				<div className="absolute top-4 left-4 z-[1000] rounded-lg bg-white/90 px-3 py-2 text-xs shadow-md backdrop-blur-sm">
					<div className="flex items-center gap-2">
						<div className="flex items-center gap-1">
							<div className="h-2 w-2 rounded-full bg-green-500" />
							<span>{geocodingStats.geocoded} localizados</span>
						</div>
						{geocodingStats.fallback > 0 && (
							<div className="flex items-center gap-1">
								<div className="h-2 w-2 rounded-full bg-yellow-500" />
								<span>{geocodingStats.fallback} aproximados</span>
							</div>
						)}
					</div>
				</div>
			)}

			<MapContainer
				center={[mapCenter.lat, mapCenter.lng]}
				zoom={zoom}
				className="h-full w-full"
				scrollWheelZoom={true}
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
						<Popup closeButton={false} className="custom-popup">
							<div className="w-64">
								<div className="flex gap-3">
									<div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg">
										{service.images?.[0] ? (
											<Image
												src={service.images[0].url}
												alt={service.title}
												fill
												className="object-cover"
											/>
										) : (
											<div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-100 to-indigo-100">
												<span className="font-semibold text-indigo-600 text-sm">
													{service.category.name.charAt(0)}
												</span>
											</div>
										)}
									</div>
									<div className="min-w-0 flex-1">
										<div className="mb-1 flex items-center justify-between">
											<h3 className="truncate font-semibold text-gray-900 text-sm">
												{service.title}
											</h3>
											<div className="flex items-center space-x-1">
												<Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
												<span className="font-medium text-xs">
													{service.avgRating?.toFixed(1) || "5.0"}
												</span>
											</div>
										</div>
										<p className="mb-2 line-clamp-2 text-gray-600 text-xs">
											{service.description}
										</p>
										<div className="flex items-center justify-between">
											<span className="font-semibold text-green-600 text-sm">
												R$ {service.price.toFixed(2)}
												{service.priceType === "hourly" && "/h"}
											</span>
											<Link href={`/services/${service.id}`}>
												<Button size="sm" className="h-7 px-3 text-xs">
													Ver Detalhes
												</Button>
											</Link>
										</div>
									</div>
								</div>
							</div>
						</Popup>
					</Marker>
				))}
			</MapContainer>

			{/* Service Info Card - appears when a service is selected */}
			{selectedService && (
				<div className="pointer-events-none absolute right-4 bottom-4 left-4 z-[1000]">
					<Card className="pointer-events-auto shadow-lg">
						<CardContent className="p-4">
							<div className="flex gap-4">
								<div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg">
									{selectedService.images?.[0] ? (
										<Image
											src={selectedService.images[0].url}
											alt={selectedService.title}
											fill
											className="object-cover"
										/>
									) : (
										<div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-100 to-indigo-100">
											<span className="font-semibold text-indigo-600 text-sm">
												{selectedService.category.name.charAt(0)}
											</span>
										</div>
									)}
								</div>
								<div className="min-w-0 flex-1">
									<div className="mb-1 flex items-center justify-between">
										<h3 className="truncate font-semibold text-gray-900 text-sm">
											{selectedService.title}
										</h3>
										<div className="flex items-center space-x-1">
											<Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
											<span className="font-medium text-xs">
												{selectedService.avgRating?.toFixed(1) || "5.0"}
											</span>
										</div>
									</div>
									<p className="mb-1 text-gray-600 text-xs">
										{selectedService.provider.name}
									</p>
									<p className="mb-2 line-clamp-2 text-gray-600 text-xs">
										{selectedService.description}
									</p>
									<div className="flex items-center justify-between">
										<span className="font-semibold text-green-600 text-sm">
											R$ {selectedService.price.toFixed(2)}
											{selectedService.priceType === "hourly" && "/h"}
										</span>
										<Link href={`/services/${selectedService.id}`}>
											<Button size="sm" className="h-7 px-3 text-xs">
												Ver Detalhes
											</Button>
										</Link>
									</div>
								</div>
							</div>
							<button
								type="button"
								onClick={() => setSelectedService(null)}
								className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
							>
								<X className="h-4 w-4" />
							</button>
						</CardContent>
					</Card>
				</div>
			)}
		</div>
	);
}
