"use client";

import { cn } from "~/lib/utils";

interface TouchTargetProps {
	children: React.ReactNode;
	className?: string;
	size?: "sm" | "md" | "lg";
	asChild?: boolean;
}

/**
 * TouchTarget ensures minimum 44px touch target size for mobile accessibility
 * Following iOS and Android design guidelines
 */
export function TouchTarget({
	children,
	className,
	size = "md",
	asChild = false,
}: TouchTargetProps) {
	const sizeClasses = {
		sm: "min-h-[44px] min-w-[44px] p-2", // 44px minimum with 8px padding
		md: "min-h-[48px] min-w-[48px] p-3", // 48px minimum with 12px padding
		lg: "min-h-[56px] min-w-[56px] p-4", // 56px minimum with 16px padding
	};

	const Component = asChild ? "span" : "div";

	return (
		<Component
			className={cn(
				"inline-flex items-center justify-center",
				"touch-manipulation", // Prevents zoom on double-tap
				"select-none", // Prevents text selection
				sizeClasses[size],
				className,
			)}
		>
			{children}
		</Component>
	);
}

/**
 * Mobile-optimized card component with proper touch targets
 */
interface TouchCardProps {
	children: React.ReactNode;
	className?: string;
	onClick?: () => void;
	href?: string;
	disabled?: boolean;
}

export function TouchCard({
	children,
	className,
	onClick,
	href,
	disabled = false,
}: TouchCardProps) {
	const Component = href ? "a" : "div";

	return (
		<Component
			href={href}
			onClick={!disabled ? onClick : undefined}
			className={cn(
				"block rounded-lg border bg-white p-4 shadow-sm transition-all",
				// Touch feedback
				"touch-manipulation active:scale-[0.98]",
				// Hover states (desktop only)
				"hover:border-gray-300 hover:shadow-md",
				// Focus states for accessibility
				"focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2",
				// Disabled state
				disabled && "pointer-events-none opacity-50",
				// Interactive cursor
				(onClick || href) && !disabled && "cursor-pointer",
				className,
			)}
			style={{
				// Ensure minimum touch target
				minHeight: "44px",
			}}
		>
			{children}
		</Component>
	);
}

/**
 * FAB (Floating Action Button) component optimized for mobile
 */
interface FABProps {
	children: React.ReactNode;
	onClick?: () => void;
	href?: string;
	className?: string;
	size?: "sm" | "md" | "lg";
	position?: "bottom-right" | "bottom-left" | "bottom-center";
}

export function FAB({
	children,
	onClick,
	href,
	className,
	size = "md",
	position = "bottom-right",
}: FABProps) {
	const Component = href ? "a" : "button";

	const sizeClasses = {
		sm: "h-12 w-12", // 48px
		md: "h-14 w-14", // 56px
		lg: "h-16 w-16", // 64px
	};

	const positionClasses = {
		"bottom-right": "fixed bottom-4 right-4 md:bottom-6 md:right-6",
		"bottom-left": "fixed bottom-4 left-4 md:bottom-6 md:left-6",
		"bottom-center": "fixed bottom-4 left-1/2 -translate-x-1/2 md:bottom-6",
	};

	return (
		<Component
			href={href}
			onClick={onClick}
			className={cn(
				"z-50 flex items-center justify-center rounded-full",
				"bg-indigo-600 text-white shadow-lg",
				"touch-manipulation active:scale-95",
				"hover:bg-indigo-700 hover:shadow-xl",
				"focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2",
				"transition-all duration-200",
				sizeClasses[size],
				positionClasses[position],
				className,
			)}
		>
			{children}
		</Component>
	);
}
