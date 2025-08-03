import { Card, CardContent } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";

export function ServiceCardSkeleton() {
	return (
		<Card className="overflow-hidden">
			<Skeleton className="aspect-video w-full" />
			<CardContent className="p-6">
				<div className="mb-2 flex items-center justify-between">
					<Skeleton className="h-6 w-24" />
					<Skeleton className="h-5 w-12" />
				</div>
				<Skeleton className="mb-2 h-6 w-3/4" />
				<Skeleton className="mb-4 h-4 w-full" />
				<Skeleton className="h-4 w-1/2" />
				<div className="mt-4 flex items-center justify-between">
					<div className="flex items-center space-x-2">
						<Skeleton className="h-8 w-8 rounded-full" />
						<Skeleton className="h-4 w-24" />
					</div>
					<Skeleton className="h-4 w-16" />
				</div>
			</CardContent>
		</Card>
	);
}

export function ServiceGridSkeleton({ count = 6 }: { count?: number }) {
	return (
		<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
			{Array.from({ length: count }).map(() => (
				<ServiceCardSkeleton key={Math.random()} />
			))}
		</div>
	);
}
