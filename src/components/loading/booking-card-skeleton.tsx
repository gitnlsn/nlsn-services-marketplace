import { Card, CardContent, CardHeader } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";

export function BookingCardSkeleton() {
	return (
		<Card>
			<CardHeader className="pb-4">
				<div className="flex items-start justify-between">
					<div className="space-y-2">
						<Skeleton className="h-6 w-48" />
						<Skeleton className="h-4 w-32" />
					</div>
					<Skeleton className="h-6 w-20" />
				</div>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="flex items-center space-x-4">
					<Skeleton className="h-12 w-12 rounded-full" />
					<div className="space-y-2">
						<Skeleton className="h-4 w-32" />
						<Skeleton className="h-3 w-24" />
					</div>
				</div>
				<div className="flex items-center justify-between pt-2">
					<Skeleton className="h-4 w-24" />
					<div className="flex gap-2">
						<Skeleton className="h-9 w-24" />
						<Skeleton className="h-9 w-24" />
					</div>
				</div>
			</CardContent>
		</Card>
	);
}

export function BookingListSkeleton({ count = 3 }: { count?: number }) {
	return (
		<div className="space-y-4">
			{Array.from({ length: count }).map(() => (
				<BookingCardSkeleton key={Math.random()} />
			))}
		</div>
	);
}
