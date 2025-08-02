import { Loader2 } from "lucide-react";

import { cn } from "~/lib/utils";

interface LoadingProps {
	className?: string;
	size?: "sm" | "md" | "lg";
	text?: string;
}

export function Loading({ className, size = "md", text }: LoadingProps) {
	const sizeClasses = {
		sm: "h-4 w-4",
		md: "h-8 w-8",
		lg: "h-12 w-12",
	};

	return (
		<div className={cn("flex items-center justify-center", className)}>
			<div className="flex flex-col items-center gap-2">
				<Loader2
					className={cn(
						"animate-spin text-muted-foreground",
						sizeClasses[size],
					)}
				/>
				{text && <p className="text-muted-foreground text-sm">{text}</p>}
			</div>
		</div>
	);
}
