"use client";

import dynamic from "next/dynamic";
import { type ComponentType, Suspense } from "react";
import { Skeleton } from "~/components/ui/skeleton";

// Generic lazy wrapper with default loading state
export function withLazyLoading<T extends object>(
	importFunction: () => Promise<{ default: ComponentType<T> }>,
	fallback?: React.ReactNode,
) {
	const LazyComponent = dynamic(importFunction, {
		loading: () =>
			(fallback || <Skeleton className="h-32 w-full" />) as React.ReactElement,
		ssr: true, // Enable SSR for better SEO
	});

	return LazyComponent;
}

// Specific lazy wrappers for common loading states
export function withPageLoading<T extends object>(
	importFunction: () => Promise<{ default: ComponentType<T> }>,
) {
	return withLazyLoading(importFunction, <PageLoadingSkeleton />);
}

export function withComponentLoading<T extends object>(
	importFunction: () => Promise<{ default: ComponentType<T> }>,
) {
	return withLazyLoading(importFunction, <ComponentLoadingSkeleton />);
}

export function withModalLoading<T extends object>(
	importFunction: () => Promise<{ default: ComponentType<T> }>,
) {
	return withLazyLoading(importFunction, <ModalLoadingSkeleton />);
}

// Loading skeletons for different contexts
function PageLoadingSkeleton() {
	return (
		<div className="container mx-auto px-4 py-8">
			<div className="space-y-6">
				{/* Header skeleton */}
				<div className="space-y-3">
					<Skeleton className="h-8 w-1/3" />
					<Skeleton className="h-4 w-2/3" />
				</div>

				{/* Content skeleton */}
				<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
					{[1, 2, 3, 4, 5, 6].map((id) => (
						<div key={`skeleton-${id}`} className="space-y-3">
							<Skeleton className="h-48 w-full rounded-lg" />
							<Skeleton className="h-4 w-full" />
							<Skeleton className="h-4 w-3/4" />
						</div>
					))}
				</div>
			</div>
		</div>
	);
}

function ComponentLoadingSkeleton() {
	return (
		<div className="space-y-4">
			<Skeleton className="h-6 w-1/4" />
			<div className="space-y-2">
				<Skeleton className="h-4 w-full" />
				<Skeleton className="h-4 w-3/4" />
				<Skeleton className="h-4 w-1/2" />
			</div>
		</div>
	);
}

function ModalLoadingSkeleton() {
	return (
		<div className="space-y-6 p-6">
			<div className="space-y-2">
				<Skeleton className="h-6 w-1/3" />
				<Skeleton className="h-4 w-full" />
			</div>
			<div className="space-y-4">
				<Skeleton className="h-10 w-full" />
				<Skeleton className="h-10 w-full" />
				<Skeleton className="h-20 w-full" />
			</div>
			<div className="flex justify-end space-x-2">
				<Skeleton className="h-10 w-20" />
				<Skeleton className="h-10 w-20" />
			</div>
		</div>
	);
}

// Suspense wrapper with error boundary
export function LazyComponent({
	children,
	fallback,
}: {
	children: React.ReactNode;
	fallback?: React.ReactNode;
}) {
	return (
		<Suspense fallback={fallback || <ComponentLoadingSkeleton />}>
			{children}
		</Suspense>
	);
}
