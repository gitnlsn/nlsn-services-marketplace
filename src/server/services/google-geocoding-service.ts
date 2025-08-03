import { env } from "~/env";

interface Coordinates {
	lat: number;
	lng: number;
}

interface GeocodeResult {
	coordinates: Coordinates;
	formattedAddress: string;
	confidence: number;
	placeId?: string;
}

interface GoogleGeocodeResponse {
	results: Array<{
		formatted_address: string;
		geometry: {
			location: {
				lat: number;
				lng: number;
			};
			location_type: string;
		};
		place_id: string;
		types: string[];
	}>;
	status: string;
}

class GoogleGeocodingService {
	private static instance: GoogleGeocodingService;
	private cache = new Map<string, GeocodeResult>();
	private readonly baseUrl =
		"https://maps.googleapis.com/maps/api/geocode/json";

	static getInstance(): GoogleGeocodingService {
		if (!GoogleGeocodingService.instance) {
			GoogleGeocodingService.instance = new GoogleGeocodingService();
		}
		return GoogleGeocodingService.instance;
	}

	/**
	 * Check if Google Maps API is configured
	 */
	isConfigured(): boolean {
		return !!env.GOOGLE_MAPS_API_KEY;
	}

	/**
	 * Geocode an address string to coordinates using Google Maps API
	 */
	async geocode(address: string): Promise<GeocodeResult | null> {
		if (!this.isConfigured()) {
			throw new Error("Google Maps API key not configured");
		}

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
			const apiKey = env.GOOGLE_MAPS_API_KEY;
			if (!apiKey) {
				throw new Error("Google Maps API key not configured");
			}

			const params = new URLSearchParams({
				address: `${address}, Brasil`, // Add Brazil to improve results
				key: apiKey,
				region: "br", // Bias results to Brazil
				language: "pt-BR",
			});

			const response = await fetch(`${this.baseUrl}?${params.toString()}`);

			if (!response.ok) {
				console.error(`Google Geocoding API error: ${response.status}`);
				return null;
			}

			const data: GoogleGeocodeResponse = await response.json();

			if (data.status !== "OK" || data.results.length === 0) {
				console.warn(`No geocoding results for: ${address}`);
				return null;
			}

			const result = data.results[0];
			if (!result) {
				console.warn(`No geocoding results for: ${address}`);
				return null;
			}

			const confidence = this.calculateConfidence(
				result.geometry.location_type,
			);

			const geocodeResult: GeocodeResult = {
				coordinates: {
					lat: result.geometry.location.lat,
					lng: result.geometry.location.lng,
				},
				formattedAddress: result.formatted_address,
				confidence,
				placeId: result.place_id,
			};

			// Cache the result
			this.cache.set(normalizedAddress, geocodeResult);

			return geocodeResult;
		} catch (error) {
			console.error("Google Geocoding error:", error);
			return null;
		}
	}

	/**
	 * Batch geocode multiple addresses
	 */
	async batchGeocode(addresses: string[]): Promise<(GeocodeResult | null)[]> {
		if (!this.isConfigured()) {
			throw new Error("Google Maps API key not configured");
		}

		const results: (GeocodeResult | null)[] = [];

		// Process in batches to manage rate limits
		const batchSize = 10; // Google has higher rate limits than Nominatim
		for (let i = 0; i < addresses.length; i += batchSize) {
			const batch = addresses.slice(i, i + batchSize);
			const batchPromises = batch.map((address) => this.geocode(address));
			const batchResults = await Promise.all(batchPromises);
			results.push(...batchResults);

			// Small delay between batches
			if (i + batchSize < addresses.length) {
				await this.delay(50);
			}
		}

		return results;
	}

	/**
	 * Reverse geocode coordinates to address
	 */
	async reverseGeocode(
		lat: number,
		lng: number,
	): Promise<GeocodeResult | null> {
		if (!this.isConfigured()) {
			throw new Error("Google Maps API key not configured");
		}

		const cacheKey = `${lat},${lng}`;
		if (this.cache.has(cacheKey)) {
			const cachedResult = this.cache.get(cacheKey);
			if (cachedResult) {
				return cachedResult;
			}
		}

		try {
			const apiKey = env.GOOGLE_MAPS_API_KEY;
			if (!apiKey) {
				throw new Error("Google Maps API key not configured");
			}

			const params = new URLSearchParams({
				latlng: `${lat},${lng}`,
				key: apiKey,
				language: "pt-BR",
			});

			const response = await fetch(`${this.baseUrl}?${params.toString()}`);

			if (!response.ok) {
				console.error(`Google Reverse Geocoding API error: ${response.status}`);
				return null;
			}

			const data: GoogleGeocodeResponse = await response.json();

			if (data.status !== "OK" || data.results.length === 0) {
				return null;
			}

			const result = data.results[0];
			if (!result) {
				return null;
			}

			const geocodeResult: GeocodeResult = {
				coordinates: { lat, lng },
				formattedAddress: result.formatted_address,
				confidence: 0.9,
				placeId: result.place_id,
			};

			this.cache.set(cacheKey, geocodeResult);
			return geocodeResult;
		} catch (error) {
			console.error("Google Reverse Geocoding error:", error);
			return null;
		}
	}

	/**
	 * Calculate confidence score based on location type
	 */
	private calculateConfidence(locationType: string): number {
		switch (locationType) {
			case "ROOFTOP":
				return 1.0;
			case "RANGE_INTERPOLATED":
				return 0.9;
			case "GEOMETRIC_CENTER":
				return 0.7;
			case "APPROXIMATE":
				return 0.5;
			default:
				return 0.3;
		}
	}

	/**
	 * Utility delay function
	 */
	private delay(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	/**
	 * Clear the geocoding cache
	 */
	clearCache(): void {
		this.cache.clear();
	}

	/**
	 * Get cache size for monitoring
	 */
	getCacheSize(): number {
		return this.cache.size;
	}
}

export const googleGeocodingService = GoogleGeocodingService.getInstance();
export type { Coordinates, GeocodeResult };
