"use client";

import { Download, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";

interface BeforeInstallPromptEvent extends Event {
	readonly platforms: string[];
	readonly userChoice: Promise<{
		outcome: "accepted" | "dismissed";
		platform: string;
	}>;
	prompt(): Promise<void>;
}

export function PWAInstaller() {
	const [deferredPrompt, setDeferredPrompt] =
		useState<BeforeInstallPromptEvent | null>(null);
	const [showInstallBanner, setShowInstallBanner] = useState(false);
	const [isInstalled, setIsInstalled] = useState(false);

	useEffect(() => {
		// Check if app is already installed
		const isAppInstalled =
			window.matchMedia("(display-mode: standalone)").matches ||
			(window.navigator as { standalone?: boolean }).standalone === true;
		setIsInstalled(isAppInstalled);

		// Listen for beforeinstallprompt event
		const handleBeforeInstallPrompt = (e: Event) => {
			e.preventDefault();
			setDeferredPrompt(e as BeforeInstallPromptEvent);

			// Show install banner if not already installed and user hasn't dismissed it
			if (!isAppInstalled && !localStorage.getItem("pwa-install-dismissed")) {
				setShowInstallBanner(true);
			}
		};

		// Listen for app installed event
		const handleAppInstalled = () => {
			setIsInstalled(true);
			setShowInstallBanner(false);
			setDeferredPrompt(null);
		};

		window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
		window.addEventListener("appinstalled", handleAppInstalled);

		return () => {
			window.removeEventListener(
				"beforeinstallprompt",
				handleBeforeInstallPrompt,
			);
			window.removeEventListener("appinstalled", handleAppInstalled);
		};
	}, []);

	const handleInstallClick = async () => {
		if (!deferredPrompt) return;

		try {
			await deferredPrompt.prompt();
			const choiceResult = await deferredPrompt.userChoice;

			if (choiceResult.outcome === "accepted") {
				console.log("User accepted the install prompt");
			} else {
				console.log("User dismissed the install prompt");
			}
		} catch (error) {
			console.error("Error during installation:", error);
		}

		setDeferredPrompt(null);
		setShowInstallBanner(false);
	};

	const handleDismiss = () => {
		setShowInstallBanner(false);
		localStorage.setItem("pwa-install-dismissed", "true");
	};

	// Don't show banner if app is installed or no install prompt available
	if (isInstalled || !showInstallBanner || !deferredPrompt) {
		return null;
	}

	return (
		<div className="fixed right-4 bottom-4 left-4 z-50 md:right-4 md:left-auto md:max-w-sm">
			<Card className="border-blue-200 bg-blue-50 shadow-lg">
				<CardContent className="p-4">
					<div className="flex items-start gap-3">
						<div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
							<Download className="h-5 w-5 text-blue-600" />
						</div>
						<div className="min-w-0 flex-1">
							<h3 className="font-semibold text-gray-900 text-sm">
								Instalar App
							</h3>
							<p className="mt-1 text-gray-600 text-xs">
								Instale nosso app para acesso rápido e funcionalidades offline
							</p>
							<div className="mt-3 flex gap-2">
								<Button
									size="sm"
									onClick={handleInstallClick}
									className="h-7 px-3 text-xs"
								>
									Instalar
								</Button>
								<Button
									size="sm"
									variant="outline"
									onClick={handleDismiss}
									className="h-7 px-3 text-xs"
								>
									Agora não
								</Button>
							</div>
						</div>
						<button
							type="button"
							onClick={handleDismiss}
							className="text-gray-400 hover:text-gray-600"
						>
							<X className="h-4 w-4" />
						</button>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
