import { cn } from "~/lib/utils";

function Skeleton({
	className,
	...props
}: React.HTMLAttributes<HTMLDivElement>) {
	return (
		<div
			className={cn(
				"animate-pulse rounded-md bg-gray-200 dark:bg-gray-800",
				className,
			)}
			{...props}
		/>
	);
}

// Predefined skeleton components for common use cases
export function CardSkeleton({ className }: { className?: string }) {
	return (
		<div className={cn("card-padding", className)}>
			<div className="space-y-3">
				<Skeleton className="h-4 w-3/4" />
				<Skeleton className="h-4 w-1/2" />
				<Skeleton className="h-20 w-full" />
				<div className="flex justify-between">
					<Skeleton className="h-4 w-1/4" />
					<Skeleton className="h-4 w-1/4" />
				</div>
			</div>
		</div>
	);
}

export function ServiceCardSkeleton({ className }: { className?: string }) {
	return (
		<div className={cn("overflow-hidden rounded-lg border", className)}>
			{/* Image skeleton */}
			<Skeleton className="aspect-video w-full" />

			{/* Content skeleton */}
			<div className="card-padding">
				<div className="mb-2 flex items-center justify-between">
					<Skeleton className="h-5 w-20" />
					<Skeleton className="h-5 w-16" />
				</div>
				<Skeleton className="mb-3 h-6 w-3/4" />
				<Skeleton className="mb-3 h-4 w-full" />
				<Skeleton className="mb-3 h-4 w-2/3" />
				<div className="flex items-center justify-between">
					<Skeleton className="h-4 w-20" />
					<Skeleton className="h-4 w-24" />
				</div>
			</div>
		</div>
	);
}

export function BookingCardSkeleton({ className }: { className?: string }) {
	return (
		<div className={cn("card-padding rounded-lg border", className)}>
			<div className="space-y-4">
				{/* Header */}
				<div className="flex items-center justify-between">
					<Skeleton className="h-6 w-1/3" />
					<Skeleton className="h-6 w-20" />
				</div>

				{/* Details */}
				<div className="space-y-2">
					<div className="flex items-center gap-2">
						<Skeleton className="h-4 w-4" />
						<Skeleton className="h-4 w-32" />
					</div>
					<div className="flex items-center gap-2">
						<Skeleton className="h-4 w-4" />
						<Skeleton className="h-4 w-24" />
					</div>
					<div className="flex items-center gap-2">
						<Skeleton className="h-4 w-4" />
						<Skeleton className="h-4 w-40" />
					</div>
				</div>

				{/* Actions */}
				<div className="flex gap-2">
					<Skeleton className="h-9 w-20" />
					<Skeleton className="h-9 w-20" />
				</div>
			</div>
		</div>
	);
}

export function ProfileSkeleton({ className }: { className?: string }) {
	return (
		<div className={cn("flex items-center gap-4", className)}>
			<Skeleton className="h-16 w-16 rounded-full" />
			<div className="flex-1 space-y-2">
				<Skeleton className="h-5 w-32" />
				<Skeleton className="h-4 w-48" />
				<div className="flex gap-2">
					<Skeleton className="h-4 w-16" />
					<Skeleton className="h-4 w-20" />
				</div>
			</div>
		</div>
	);
}

export function TableSkeleton({
	rows = 5,
	columns = 4,
	className,
}: {
	rows?: number;
	columns?: number;
	className?: string;
}) {
	return (
		<div className={cn("space-y-2", className)}>
			{/* Header */}
			<div
				className="grid gap-4"
				style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
			>
				{Array.from({ length: columns }, (_, i) => (
					<Skeleton
						key={`header-${crypto.randomUUID()}`}
						className="h-4 w-full"
					/>
				))}
			</div>

			{/* Rows */}
			{Array.from({ length: rows }, (_, rowIndex) => (
				<div
					key={`row-${crypto.randomUUID()}`}
					className="grid gap-4"
					style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
				>
					{Array.from({ length: columns }, (_, colIndex) => (
						<Skeleton
							key={`cell-${crypto.randomUUID()}`}
							className="h-4 w-full"
						/>
					))}
				</div>
			))}
		</div>
	);
}

export function ListSkeleton({
	items = 5,
	className,
}: {
	items?: number;
	className?: string;
}) {
	return (
		<div className={cn("space-y-3", className)}>
			{Array.from({ length: items }, (_, i) => (
				<div
					key={`item-${crypto.randomUUID()}`}
					className="flex items-center gap-3"
				>
					<Skeleton className="h-4 w-4 rounded" />
					<div className="flex-1 space-y-1">
						<Skeleton className="h-4 w-3/4" />
						<Skeleton className="h-3 w-1/2" />
					</div>
					<Skeleton className="h-8 w-16" />
				</div>
			))}
		</div>
	);
}

export function SearchResultsSkeleton({ className }: { className?: string }) {
	return (
		<div className={cn("space-y-6", className)}>
			{/* Search filters skeleton */}
			<div className="flex gap-2">
				<Skeleton className="h-10 w-32" />
				<Skeleton className="h-10 w-24" />
				<Skeleton className="h-10 w-28" />
			</div>

			{/* Results count */}
			<Skeleton className="h-5 w-48" />

			{/* Results grid */}
			<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
				{Array.from({ length: 6 }, (_, i) => (
					<ServiceCardSkeleton key={`service-${crypto.randomUUID()}`} />
				))}
			</div>
		</div>
	);
}

export function DashboardSkeleton({ className }: { className?: string }) {
	return (
		<div className={cn("space-y-8", className)}>
			{/* Header */}
			<div className="space-y-2">
				<Skeleton className="h-8 w-64" />
				<Skeleton className="h-4 w-96" />
			</div>

			{/* Stats cards */}
			<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
				{Array.from({ length: 4 }, (_, i) => (
					<div
						key={`stats-${crypto.randomUUID()}`}
						className="card-padding rounded-lg border"
					>
						<div className="space-y-2">
							<Skeleton className="h-4 w-20" />
							<Skeleton className="h-8 w-16" />
							<Skeleton className="h-3 w-24" />
						</div>
					</div>
				))}
			</div>

			{/* Content sections */}
			<div className="grid gap-8 lg:grid-cols-2">
				<div className="space-y-4">
					<Skeleton className="h-6 w-32" />
					<ListSkeleton items={5} />
				</div>
				<div className="space-y-4">
					<Skeleton className="h-6 w-40" />
					<TableSkeleton rows={5} columns={3} />
				</div>
			</div>
		</div>
	);
}

export { Skeleton };
