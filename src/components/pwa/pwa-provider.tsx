"use client";

import { useEffect } from "react";
import { registerServiceWorker } from "~/lib/pwa";
import { PWAInstaller } from "./pwa-installer";

export function PWAProvider({ children }: { children: React.ReactNode }) {
	useEffect(() => {
		// Register service worker
		registerServiceWorker();
	}, []);

	return (
		<>
			{children}
			<PWAInstaller />
		</>
	);
}
