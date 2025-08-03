"use client";

import { AlertTriangle, CheckCircle, Info, XCircle } from "lucide-react";
import { useEffect } from "react";
import {
	Toast,
	ToastClose,
	ToastDescription,
	ToastTitle,
} from "~/components/ui/toast";
import { useToast } from "~/hooks/use-toast";
import { registerGlobalToast } from "~/lib/toast";

const toastIcons = {
	default: null,
	destructive: XCircle,
	success: CheckCircle,
	warning: AlertTriangle,
	info: Info,
} as const;

export function Toaster() {
	const { toasts, toast } = useToast();

	// Register global toast function for use outside components
	useEffect(() => {
		registerGlobalToast(toast);
	}, [toast]);

	return (
		<div className="fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:top-auto sm:right-0 sm:bottom-0 sm:flex-col md:max-w-[420px]">
			{toasts.map((toast) => {
				const IconComponent = toastIcons[toast.variant || "default"];

				return (
					<Toast key={toast.id} variant={toast.variant}>
						<div className="flex items-start space-x-3">
							{IconComponent && (
								<IconComponent className="mt-0.5 h-5 w-5 flex-shrink-0" />
							)}
							<div className="grid gap-1">
								{toast.title && <ToastTitle>{toast.title}</ToastTitle>}
								{toast.description && (
									<ToastDescription>{toast.description}</ToastDescription>
								)}
							</div>
						</div>
						{toast.action}
						<ToastClose />
					</Toast>
				);
			})}
		</div>
	);
}
