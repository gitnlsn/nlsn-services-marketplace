// Code splitting utilities and route-based loading strategies

/**
 * Preload a route when user hovers over a link
 * This improves perceived performance by loading components before they're needed
 */
export function preloadRoute(route: string) {
	if (typeof window !== "undefined") {
		const link = document.createElement("link");
		link.rel = "prefetch";
		link.href = route;
		document.head.appendChild(link);
	}
}

/**
 * Preload critical routes on idle
 * This loads important routes when the browser is idle
 */
export function preloadCriticalRoutes() {
	if (typeof window !== "undefined" && "requestIdleCallback" in window) {
		window.requestIdleCallback(() => {
			// Preload most commonly visited routes
			const criticalRoutes = [
				"/search",
				"/dashboard",
				"/bookings",
				"/profile",
				"/services/create",
			];

			for (const route of criticalRoutes) {
				preloadRoute(route);
			}
		});
	}
}

/**
 * Load component based on user role
 * This conditionally loads components based on authentication and roles
 */
export async function loadRoleBasedComponent(
	userRole: "client" | "professional" | "admin" | null,
	components: {
		client?: () => Promise<unknown>;
		professional?: () => Promise<unknown>;
		admin?: () => Promise<unknown>;
		guest?: () => Promise<unknown>;
	},
) {
	if (!userRole && components.guest) {
		return await components.guest();
	}

	const loader = components[userRole as keyof typeof components];
	if (loader) {
		return await loader();
	}

	// Fallback to guest component if available
	if (components.guest) {
		return await components.guest();
	}

	throw new Error(`No component available for role: ${userRole}`);
}

/**
 * Progressive enhancement loader
 * Loads enhanced features progressively for better perceived performance
 */
export class ProgressiveLoader {
	private loadedFeatures = new Set<string>();

	async loadFeature(
		featureName: string,
		loader: () => Promise<unknown>,
		condition?: () => boolean,
	) {
		if (this.loadedFeatures.has(featureName)) {
			return;
		}

		if (condition && !condition()) {
			return;
		}

		try {
			await loader();
			this.loadedFeatures.add(featureName);
			console.log(`✅ Feature loaded: ${featureName}`);
		} catch (error) {
			console.error(`❌ Failed to load feature: ${featureName}`, error);
		}
	}

	async loadCriticalFeatures() {
		// Load features that are needed for core functionality
		await Promise.all([
			this.loadFeature(
				"authentication",
				() => import("~/components/auth/with-auth"),
			),
			this.loadFeature(
				"notifications",
				() => import("~/components/notifications/realtime-notifications"),
			),
		]);
	}

	async loadEnhancedFeatures() {
		// Load features that enhance the experience but aren't critical
		await Promise.all([
			this.loadFeature("pwa", () => import("~/components/pwa/pwa-installer")),
			this.loadFeature(
				"messaging",
				() => import("~/components/messaging/messaging-interface"),
			),
			this.loadFeature("maps", () => import("~/components/map/map-view")),
		]);
	}

	isFeatureLoaded(featureName: string): boolean {
		return this.loadedFeatures.has(featureName);
	}
}

// Global progressive loader instance
export const progressiveLoader = new ProgressiveLoader();

/**
 * Route priority definitions for intelligent preloading
 */
export const routePriorities = {
	// Critical routes - always preload
	critical: ["/", "/search", "/login"],

	// High priority - preload on user interaction
	high: ["/dashboard", "/bookings", "/profile", "/services/create"],

	// Medium priority - preload on idle
	medium: ["/become-professional", "/settings"],

	// Low priority - load on demand only
	low: ["/auth/signin", "/auth/error"],
} as const;

/**
 * Implement intelligent preloading based on user behavior
 */
export function setupIntelligentPreloading() {
	if (typeof window === "undefined") return;

	// Preload routes on link hover
	document.addEventListener("mouseover", (event) => {
		const target = event.target as HTMLElement;
		const link = target.closest("a[href]") as HTMLAnchorElement;

		if (link?.href.startsWith(window.location.origin)) {
			const route = new URL(link.href).pathname;
			preloadRoute(route);
		}
	});

	// Preload critical routes immediately
	routePriorities.critical.forEach(preloadRoute);

	// Preload medium priority routes on idle
	if ("requestIdleCallback" in window) {
		window.requestIdleCallback(() => {
			routePriorities.medium.forEach(preloadRoute);
		});
	}
}

/**
 * Intersection Observer for lazy loading below-the-fold components
 */
export function createLazyLoader(threshold = 0.1) {
	if (typeof window === "undefined") return null;

	return new IntersectionObserver(
		(entries) => {
			for (const entry of entries) {
				if (entry.isIntersecting) {
					const element = entry.target as HTMLElement;
					const lazyLoader = element.dataset.lazyLoader;

					if (lazyLoader) {
						// Trigger lazy loading
						element.dispatchEvent(new CustomEvent("lazyLoad"));
					}
				}
			}
		},
		{ threshold },
	);
}
