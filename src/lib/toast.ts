// Global toast utility for use outside of React components
// This allows for toast notifications from API calls, utilities, etc.

let globalToastFunction:
	| ((options: {
			title: string;
			description?: string;
			variant?: "default" | "destructive" | "success" | "warning" | "info";
			duration?: number;
	  }) => string)
	| null = null;

// Register the toast function from useToast hook
export function registerGlobalToast(toastFn: typeof globalToastFunction) {
	globalToastFunction = toastFn;
}

// Global toast methods that can be used anywhere
export const toast = {
	success: (title: string, description?: string, duration?: number) => {
		if (globalToastFunction) {
			return globalToastFunction({
				title,
				description,
				variant: "success",
				duration,
			});
		}
		console.log(`SUCCESS: ${title}${description ? ` - ${description}` : ""}`);
		return "";
	},

	error: (title: string, description?: string, duration?: number) => {
		if (globalToastFunction) {
			return globalToastFunction({
				title,
				description,
				variant: "destructive",
				duration,
			});
		}
		console.error(`ERROR: ${title}${description ? ` - ${description}` : ""}`);
		return "";
	},

	warning: (title: string, description?: string, duration?: number) => {
		if (globalToastFunction) {
			return globalToastFunction({
				title,
				description,
				variant: "warning",
				duration,
			});
		}
		console.warn(`WARNING: ${title}${description ? ` - ${description}` : ""}`);
		return "";
	},

	info: (title: string, description?: string, duration?: number) => {
		if (globalToastFunction) {
			return globalToastFunction({
				title,
				description,
				variant: "info",
				duration,
			});
		}
		console.info(`INFO: ${title}${description ? ` - ${description}` : ""}`);
		return "";
	},

	default: (title: string, description?: string, duration?: number) => {
		if (globalToastFunction) {
			return globalToastFunction({
				title,
				description,
				variant: "default",
				duration,
			});
		}
		console.log(`TOAST: ${title}${description ? ` - ${description}` : ""}`);
		return "";
	},
};

// Convenience methods for common use cases
export const showSuccess = toast.success;
export const showError = toast.error;
export const showWarning = toast.warning;
export const showInfo = toast.info;
