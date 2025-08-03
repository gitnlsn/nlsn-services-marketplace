// PWA utility functions

export function registerServiceWorker() {
	if (typeof window !== "undefined" && "serviceWorker" in navigator) {
		window.addEventListener("load", async () => {
			try {
				const registration = await navigator.serviceWorker.register("/sw.js");
				console.log("Service Worker registered successfully:", registration);

				// Listen for updates
				registration.addEventListener("updatefound", () => {
					const newWorker = registration.installing;
					if (newWorker) {
						newWorker.addEventListener("statechange", () => {
							if (
								newWorker.state === "installed" &&
								navigator.serviceWorker.controller
							) {
								// New content is available
								console.log("New content is available; please refresh.");

								// Optionally show a notification to the user
								if (
									window.confirm("Nova versão disponível! Recarregar a página?")
								) {
									window.location.reload();
								}
							}
						});
					}
				});
			} catch (error) {
				console.error("Service Worker registration failed:", error);
			}
		});
	}
}

export function unregisterServiceWorker() {
	if (typeof window !== "undefined" && "serviceWorker" in navigator) {
		navigator.serviceWorker.ready
			.then((registration) => {
				registration.unregister();
			})
			.catch((error) => {
				console.error(error.message);
			});
	}
}

export function checkForUpdates() {
	if (typeof window !== "undefined" && "serviceWorker" in navigator) {
		navigator.serviceWorker.ready
			.then((registration) => {
				registration.update();
			})
			.catch((error) => {
				console.error("Error checking for updates:", error);
			});
	}
}

export function isStandalone(): boolean {
	if (typeof window === "undefined") return false;

	return (
		window.matchMedia("(display-mode: standalone)").matches ||
		(window.navigator as { standalone?: boolean }).standalone === true ||
		document.referrer.includes("android-app://")
	);
}

export function canInstall(): boolean {
	if (typeof window === "undefined") return false;

	// Check if browser supports PWA installation
	return "serviceWorker" in navigator && "BeforeInstallPromptEvent" in window;
}
