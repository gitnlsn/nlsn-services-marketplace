// Service Worker for Savoir Link
const CACHE_NAME = "savoir-link-v1";
const STATIC_CACHE_NAME = "savoir-link-static-v1";
const DYNAMIC_CACHE_NAME = "savoir-link-dynamic-v1";

// Files to cache on install
const STATIC_FILES = [
	"/",
	"/search",
	"/manifest.json",
	// Add more critical routes as needed
];

// Install event
self.addEventListener("install", (event) => {
	console.log("Service Worker installing...");
	event.waitUntil(
		caches
			.open(STATIC_CACHE_NAME)
			.then((cache) => {
				console.log("Caching static files");
				return cache.addAll(STATIC_FILES);
			})
			.then(() => {
				return self.skipWaiting();
			}),
	);
});

// Activate event
self.addEventListener("activate", (event) => {
	console.log("Service Worker activating...");
	event.waitUntil(
		caches
			.keys()
			.then((cacheNames) => {
				return Promise.all(
					cacheNames.map((cacheName) => {
						if (
							cacheName !== STATIC_CACHE_NAME &&
							cacheName !== DYNAMIC_CACHE_NAME
						) {
							console.log("Deleting old cache:", cacheName);
							return caches.delete(cacheName);
						}
					}),
				);
			})
			.then(() => {
				return self.clients.claim();
			}),
	);
});

// Fetch event - Cache-first strategy for static assets, network-first for API calls
self.addEventListener("fetch", (event) => {
	const { request } = event;
	const url = new URL(request.url);

	// Skip cross-origin requests
	if (url.origin !== location.origin) {
		return;
	}

	// Skip non-GET requests
	if (request.method !== "GET") {
		return;
	}

	// API calls - Network first, fallback to cache
	if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/trpc/")) {
		event.respondWith(
			fetch(request)
				.then((response) => {
					// Clone response before caching
					const responseClone = response.clone();

					// Cache successful responses
					if (response.status === 200) {
						caches.open(DYNAMIC_CACHE_NAME).then((cache) => {
							cache.put(request, responseClone);
						});
					}

					return response;
				})
				.catch(() => {
					// Network failed, try cache
					return caches.match(request);
				}),
		);
		return;
	}

	// Static assets - Cache first, fallback to network
	event.respondWith(
		caches
			.match(request)
			.then((cachedResponse) => {
				if (cachedResponse) {
					return cachedResponse;
				}

				// Not in cache, fetch from network
				return fetch(request).then((response) => {
					// Don't cache non-successful responses
					if (
						!response ||
						response.status !== 200 ||
						response.type !== "basic"
					) {
						return response;
					}

					// Clone response before caching
					const responseClone = response.clone();

					caches.open(DYNAMIC_CACHE_NAME).then((cache) => {
						cache.put(request, responseClone);
					});

					return response;
				});
			})
			.catch(() => {
				// Both cache and network failed
				// Return offline page for navigation requests
				if (request.destination === "document") {
					return caches.match("/");
				}
			}),
	);
});

// Background sync for form submissions when offline
self.addEventListener("sync", (event) => {
	if (event.tag === "background-sync") {
		console.log("Background sync triggered");
		// Handle queued form submissions here
	}
});

// Push notifications (if implemented)
self.addEventListener("push", (event) => {
	if (event.data) {
		const data = event.data.json();
		const options = {
			body: data.body,
			icon: "/icons/icon-192x192.png",
			badge: "/icons/icon-72x72.png",
			vibrate: [200, 100, 200],
			data: data.data || {},
			actions: [
				{
					action: "view",
					title: "Ver",
					icon: "/icons/icon-72x72.png",
				},
				{
					action: "dismiss",
					title: "Descartar",
				},
			],
		};

		event.waitUntil(self.registration.showNotification(data.title, options));
	}
});

// Handle notification clicks
self.addEventListener("notificationclick", (event) => {
	event.notification.close();

	if (event.action === "view") {
		// Open the app or navigate to specific page
		event.waitUntil(clients.openWindow(event.notification.data.url || "/"));
	}
});
