"use client";

import { MapPin } from "lucide-react";
import dynamic from "next/dynamic";

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

// Dynamically import the map component with no SSR
const MapViewClient = dynamic(
	() => import("./map-view-client").then((mod) => mod.MapViewClient),
	{
		ssr: false,
		loading: () => (
			<div className="flex h-96 w-full items-center justify-center rounded-lg border bg-gray-100">
				<div className="text-center">
					<MapPin className="mx-auto mb-2 h-8 w-8 text-gray-400" />
					<p className="text-gray-500">Carregando mapa...</p>
				</div>
			</div>
		),
	},
);

export function MapView(props: MapViewProps) {
	return <MapViewClient {...props} />;
}
