"use client";

import { cn } from "~/lib/utils";

interface ResponsiveContainerProps {
	children: React.ReactNode;
	className?: string;
	size?: "sm" | "md" | "lg" | "xl" | "full";
	padding?: "none" | "sm" | "md" | "lg";
	centered?: boolean;
}

/**
 * Responsive container with mobile-first design
 * Provides consistent spacing and max-widths across breakpoints
 */
export function ResponsiveContainer({
	children,
	className,
	size = "lg",
	padding = "md",
	centered = true,
}: ResponsiveContainerProps) {
	const sizeClasses = {
		sm: "max-w-sm", // 384px
		md: "max-w-2xl", // 672px
		lg: "max-w-4xl", // 896px
		xl: "max-w-6xl", // 1152px
		full: "max-w-none", // No max width
	};

	const paddingClasses = {
		none: "",
		sm: "px-4 py-2", // 16px horizontal, 8px vertical
		md: "px-4 py-4 sm:px-6 sm:py-6", // Responsive padding
		lg: "px-4 py-6 sm:px-8 sm:py-8", // Large padding
	};

	return (
		<div
			className={cn(
				"w-full",
				centered && "mx-auto",
				sizeClasses[size],
				paddingClasses[padding],
				className,
			)}
		>
			{children}
		</div>
	);
}

/**
 * Mobile-optimized grid that stacks on small screens
 */
interface ResponsiveGridProps {
	children: React.ReactNode;
	className?: string;
	cols?: 1 | 2 | 3 | 4;
	gap?: "sm" | "md" | "lg";
	breakpoint?: "sm" | "md" | "lg";
}

export function ResponsiveGrid({
	children,
	className,
	cols = 3,
	gap = "md",
	breakpoint = "md",
}: ResponsiveGridProps) {
	const gapClasses = {
		sm: "gap-3",
		md: "gap-4 sm:gap-6",
		lg: "gap-6 sm:gap-8",
	};

	const colClasses = {
		1: {
			sm: "sm:grid-cols-1",
			md: "md:grid-cols-1",
			lg: "lg:grid-cols-1",
		},
		2: {
			sm: "sm:grid-cols-2",
			md: "md:grid-cols-2",
			lg: "lg:grid-cols-2",
		},
		3: {
			sm: "sm:grid-cols-2 md:grid-cols-3",
			md: "md:grid-cols-2 lg:grid-cols-3",
			lg: "lg:grid-cols-2 xl:grid-cols-3",
		},
		4: {
			sm: "sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4",
			md: "md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
			lg: "lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4",
		},
	};

	return (
		<div
			className={cn(
				"grid grid-cols-1", // Always single column on mobile
				colClasses[cols][breakpoint],
				gapClasses[gap],
				className,
			)}
		>
			{children}
		</div>
	);
}

/**
 * Stack component that handles responsive layouts
 */
interface ResponsiveStackProps {
	children: React.ReactNode;
	className?: string;
	direction?: "column" | "row";
	breakpoint?: "sm" | "md" | "lg";
	gap?: "sm" | "md" | "lg";
	align?: "start" | "center" | "end" | "stretch";
	justify?: "start" | "center" | "end" | "between" | "around";
}

export function ResponsiveStack({
	children,
	className,
	direction = "column",
	breakpoint = "md",
	gap = "md",
	align = "stretch",
	justify = "start",
}: ResponsiveStackProps) {
	const gapClasses = {
		sm: "gap-2",
		md: "gap-4",
		lg: "gap-6",
	};

	const alignClasses = {
		start: "items-start",
		center: "items-center",
		end: "items-end",
		stretch: "items-stretch",
	};

	const justifyClasses = {
		start: "justify-start",
		center: "justify-center",
		end: "justify-end",
		between: "justify-between",
		around: "justify-around",
	};

	const directionClass =
		direction === "row" ? `flex-col ${breakpoint}:flex-row` : "flex-col";

	return (
		<div
			className={cn(
				"flex",
				directionClass,
				gapClasses[gap],
				alignClasses[align],
				justifyClasses[justify],
				className,
			)}
		>
			{children}
		</div>
	);
}

/**
 * Section component with consistent mobile spacing
 */
interface SectionProps {
	children: React.ReactNode;
	className?: string;
	size?: "sm" | "md" | "lg" | "xl";
	background?: "default" | "white" | "gray";
}

export function Section({
	children,
	className,
	size = "md",
	background = "default",
}: SectionProps) {
	const sizeClasses = {
		sm: "py-8 sm:py-12", // Small section
		md: "py-12 sm:py-16", // Medium section
		lg: "py-16 sm:py-20", // Large section
		xl: "py-20 sm:py-24", // Extra large section
	};

	const backgroundClasses = {
		default: "",
		white: "bg-white",
		gray: "bg-gray-50",
	};

	return (
		<section
			className={cn(
				sizeClasses[size],
				backgroundClasses[background],
				className,
			)}
		>
			{children}
		</section>
	);
}
