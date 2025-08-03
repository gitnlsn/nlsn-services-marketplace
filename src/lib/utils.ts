import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

// Re-export formatting functions from UI components for backward compatibility
export { formatPrice } from "~/components/ui/price-display";
export { formatDate } from "~/components/ui/date-display";
export { getStatusBadge } from "~/components/ui/status-badge";

// Alias for backward compatibility
export { formatPrice as formatCurrency } from "~/components/ui/price-display";
