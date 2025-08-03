import { Card, CardContent, CardHeader } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";

export function DashboardStatsSkeleton() {
	return (
		<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
			{Array.from({ length: 4 }).map(() => (
				<Card key={Math.random()}>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<Skeleton className="h-4 w-24" />
						<Skeleton className="h-4 w-4" />
					</CardHeader>
					<CardContent>
						<Skeleton className="h-8 w-32" />
						<Skeleton className="mt-1 h-3 w-20" />
					</CardContent>
				</Card>
			))}
		</div>
	);
}

export function EarningsChartSkeleton() {
	return (
		<Card>
			<CardHeader>
				<Skeleton className="h-6 w-32" />
				<Skeleton className="h-4 w-48" />
			</CardHeader>
			<CardContent>
				<Skeleton className="h-64 w-full" />
			</CardContent>
		</Card>
	);
}

export function TransactionTableSkeleton() {
	return (
		<Card>
			<CardHeader>
				<Skeleton className="h-6 w-40" />
			</CardHeader>
			<CardContent>
				<div className="space-y-3">
					{Array.from({ length: 5 }).map(() => (
						<div
							key={Math.random()}
							className="flex items-center justify-between border-b py-3"
						>
							<div className="space-y-1">
								<Skeleton className="h-4 w-48" />
								<Skeleton className="h-3 w-32" />
							</div>
							<Skeleton className="h-5 w-20" />
						</div>
					))}
				</div>
			</CardContent>
		</Card>
	);
}
