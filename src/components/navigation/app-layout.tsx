"use client";

import { useEffect } from "react";
import {
	progressiveLoader,
	setupIntelligentPreloading,
} from "~/lib/code-splitting";
import { cn } from "~/lib/utils";
import { BottomNav } from "./bottom-nav";
import { MainHeader } from "./main-header";

interface AppLayoutProps {
	children: React.ReactNode;
	className?: string;
	showHeader?: boolean;
	showBottomNav?: boolean;
}

export function AppLayout({
	children,
	className,
	showHeader = true,
	showBottomNav = true,
}: AppLayoutProps) {
	// Setup progressive loading and intelligent preloading
	useEffect(() => {
		// Setup intelligent route preloading
		setupIntelligentPreloading();

		// Load critical features immediately
		progressiveLoader.loadCriticalFeatures();

		// Load enhanced features on idle
		if (typeof window !== "undefined" && "requestIdleCallback" in window) {
			window.requestIdleCallback(() => {
				progressiveLoader.loadEnhancedFeatures();
			});
		}
	}, []);

	return (
		<div className="min-h-screen bg-gray-50">
			{/* Header */}
			{showHeader && <MainHeader />}

			{/* Main Content */}
			<main
				className={cn(
					"min-h-screen",
					// Add top padding when header is shown
					showHeader && "pt-0",
					// Add bottom padding on mobile when bottom nav is shown
					showBottomNav && "pb-16 md:pb-0",
					className,
				)}
			>
				{children}
			</main>

			{/* Bottom Navigation - Mobile Only */}
			{showBottomNav && <BottomNav />}
		</div>
	);
}
