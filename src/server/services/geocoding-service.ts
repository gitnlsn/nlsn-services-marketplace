/**
 * Geocoding Service
 *
 * Provides geocoding functionality to convert addresses to coordinates.
 * Supports both OpenStreetMap Nominatim API (free) and Google Maps Geocoding API.
 * Provider selection is automatic based on configuration.
 */

import { env } from "~/env";
import { googleGeocodingService } from "./google-geocoding-service";

interface Coordinates {
	lat: number;
	lng: number;
}

interface GeocodeResult {
	coordinates: Coordinates;
	formattedAddress: string;
	confidence: number; // 0-1 scale
	placeId?: string;
}

export type GeocodingProvider = "openstreetmap" | "google";

interface NominatimResponse {
	lat: string;
	lon: string;
	display_name: string;
	importance: number;
	place_id: number;
}

class GeocodingService {
	private static instance: GeocodingService;
	private cache = new Map<string, GeocodeResult>();
	private readonly baseUrl = "https://nominatim.openstreetmap.org";

	static getInstance(): GeocodingService {
		if (!GeocodingService.instance) {
			GeocodingService.instance = new GeocodingService();
		}
		return GeocodingService.instance;
	}

	/**
	 * Get the active geocoding provider based on configuration
	 */
	getProvider(): GeocodingProvider {
		// Check if Google Maps is configured and preferred
		if (
			env.GEOCODING_PROVIDER === "google" &&
			googleGeocodingService.isConfigured()
		) {
			return "google";
		}

		// Default to OpenStreetMap (always available)
		return "openstreetmap";
	}

	/**
	 * Geocode an address string to coordinates using the configured provider
	 */
	async geocode(address: string): Promise<GeocodeResult | null> {
		const provider = this.getProvider();

		if (provider === "google") {
			return await googleGeocodingService.geocode(address);
		}

		// Use OpenStreetMap implementation
		return await this.geocodeWithNominatim(address);
	}

	/**
	 * Geocode an address string using OpenStreetMap Nominatim
	 */
	private async geocodeWithNominatim(
		address: string,
	): Promise<GeocodeResult | null> {
		if (!address || address.trim().length === 0) {
			return null;
		}

		const normalizedAddress = address.trim().toLowerCase();

		// Check cache first
		if (this.cache.has(normalizedAddress)) {
			const cachedResult = this.cache.get(normalizedAddress);
			if (cachedResult) {
				return cachedResult;
			}
		}

		try {
			// Add country restriction to Brazil for better results
			const searchQuery = `${address}, Brasil`;
			const params = new URLSearchParams({
				q: searchQuery,
				format: "json",
				limit: "1",
				countrycodes: "br", // Restrict to Brazil
				addressdetails: "1",
			});

			const response = await fetch(
				`${this.baseUrl}/search?${params.toString()}`,
				{
					headers: {
						"User-Agent": "NlsnServicesMarketplace/1.0",
					},
				},
			);

			if (!response.ok) {
				console.warn(`Geocoding API error: ${response.status}`);
				return this.getFallbackCoordinates(address);
			}

			const data: NominatimResponse[] = await response.json();

			if (data.length === 0) {
				console.warn(`No geocoding results for: ${address}`);
				return this.getFallbackCoordinates(address);
			}

			const result = data[0];
			if (!result) {
				console.warn(`Invalid geocoding result for: ${address}`);
				return this.getFallbackCoordinates(address);
			}

			const geocodeResult: GeocodeResult = {
				coordinates: {
					lat: Number.parseFloat(result.lat),
					lng: Number.parseFloat(result.lon),
				},
				formattedAddress: result.display_name,
				confidence: Math.min(result.importance * 2, 1), // Scale importance to 0-1
			};

			// Cache the result
			this.cache.set(normalizedAddress, geocodeResult);

			return geocodeResult;
		} catch (error) {
			console.error("Geocoding error:", error);
			return this.getFallbackCoordinates(address);
		}
	}

	/**
	 * Batch geocode multiple addresses using the configured provider
	 */
	async batchGeocode(addresses: string[]): Promise<(GeocodeResult | null)[]> {
		const provider = this.getProvider();

		if (provider === "google") {
			return await googleGeocodingService.batchGeocode(addresses);
		}

		// Use OpenStreetMap implementation
		return await this.batchGeocodeWithNominatim(addresses);
	}

	/**
	 * Batch geocode multiple addresses using OpenStreetMap Nominatim
	 */
	private async batchGeocodeWithNominatim(
		addresses: string[],
	): Promise<(GeocodeResult | null)[]> {
		const results: (GeocodeResult | null)[] = [];

		// Process in batches to respect rate limits
		const batchSize = 5;
		for (let i = 0; i < addresses.length; i += batchSize) {
			const batch = addresses.slice(i, i + batchSize);
			const batchPromises = batch.map((address) =>
				this.geocodeWithNominatim(address),
			);
			const batchResults = await Promise.all(batchPromises);
			results.push(...batchResults);

			// Add small delay between batches to be respectful to the API
			if (i + batchSize < addresses.length) {
				await this.delay(100);
			}
		}

		return results;
	}

	/**
	 * Generate fallback coordinates based on location string
	 * Uses a deterministic approach for consistent results
	 */
	private getFallbackCoordinates(location: string): GeocodeResult {
		// São Paulo city center as base
		const baseCoords = { lat: -23.5505, lng: -46.6333 };

		// Generate consistent offset based on location string
		const hash = this.hashString(location);
		const latOffset = ((hash % 1000) / 1000 - 0.5) * 0.2; // ±0.1 degrees
		const lngOffset = (((hash * 7) % 1000) / 1000 - 0.5) * 0.2;

		return {
			coordinates: {
				lat: baseCoords.lat + latOffset,
				lng: baseCoords.lng + lngOffset,
			},
			formattedAddress: location,
			confidence: 0.3, // Low confidence for fallback
		};
	}

	/**
	 * Hash string to number for consistent coordinate generation
	 */
	private hashString(str: string): number {
		let hash = 0;
		for (let i = 0; i < str.length; i++) {
			const char = str.charCodeAt(i);
			hash = (hash << 5) - hash + char;
			hash = hash & hash; // Convert to 32-bit integer
		}
		return Math.abs(hash);
	}

	/**
	 * Utility delay function
	 */
	private delay(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	/**
	 * Reverse geocode coordinates to address
	 */
	async reverseGeocode(
		lat: number,
		lng: number,
	): Promise<GeocodeResult | null> {
		const provider = this.getProvider();

		if (provider === "google") {
			return await googleGeocodingService.reverseGeocode(lat, lng);
		}

		// OpenStreetMap reverse geocoding is not implemented yet
		return null;
	}

	/**
	 * Clear the geocoding cache
	 */
	clearCache(): void {
		this.cache.clear();
		if (this.getProvider() === "google") {
			googleGeocodingService.clearCache();
		}
	}

	/**
	 * Get cache size for monitoring
	 */
	getCacheSize(): number {
		const localCache = this.cache.size;
		const googleCache =
			this.getProvider() === "google"
				? googleGeocodingService.getCacheSize()
				: 0;
		return localCache + googleCache;
	}

	/**
	 * Get geocoding provider status
	 */
	getProviderStatus(): {
		provider: GeocodingProvider;
		providers: {
			openstreetmap: boolean;
			google: boolean;
		};
	} {
		return {
			provider: this.getProvider(),
			providers: {
				openstreetmap: true, // Always available
				google: googleGeocodingService.isConfigured(),
			},
		};
	}
}

export const geocodingService = GeocodingService.getInstance();
export type { Coordinates, GeocodeResult };
