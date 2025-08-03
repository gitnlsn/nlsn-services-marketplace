import { Card, CardContent } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";

export function ProfileHeaderSkeleton() {
	return (
		<div className="relative">
			<Skeleton className="h-48 w-full" />
			<div className="absolute right-0 bottom-0 left-0 translate-y-1/2 px-4">
				<div className="mx-auto flex max-w-4xl items-end gap-4">
					<Skeleton className="h-32 w-32 rounded-full border-4 border-white" />
					<div className="mb-4 flex-1 space-y-2">
						<Skeleton className="h-8 w-48" />
						<Skeleton className="h-4 w-32" />
					</div>
				</div>
			</div>
		</div>
	);
}

export function ProfileFormSkeleton() {
	return (
		<Card>
			<CardContent className="space-y-6 p-6">
				<div className="space-y-2">
					<Skeleton className="h-4 w-16" />
					<Skeleton className="h-10 w-full" />
				</div>
				<div className="space-y-2">
					<Skeleton className="h-4 w-16" />
					<Skeleton className="h-10 w-full" />
				</div>
				<div className="space-y-2">
					<Skeleton className="h-4 w-16" />
					<Skeleton className="h-20 w-full" />
				</div>
				<div className="grid gap-4 md:grid-cols-2">
					<div className="space-y-2">
						<Skeleton className="h-4 w-16" />
						<Skeleton className="h-10 w-full" />
					</div>
					<div className="space-y-2">
						<Skeleton className="h-4 w-16" />
						<Skeleton className="h-10 w-full" />
					</div>
				</div>
				<Skeleton className="h-10 w-32" />
			</CardContent>
		</Card>
	);
}
