import { useCallback, useEffect, useState } from "react";
import type { ToastActionElement } from "~/components/ui/toast";

const TOAST_LIMIT = 5;
const TOAST_REMOVE_DELAY = 5000;

export interface Toast {
	id: string;
	title?: string;
	description?: string;
	variant?: "default" | "destructive" | "success" | "warning" | "info";
	action?: ToastActionElement;
	duration?: number;
}

interface ToastState {
	toasts: Toast[];
}

const toastState: ToastState = {
	toasts: [],
};

let listeners: Array<(state: ToastState) => void> = [];
const timeouts = new Map<string, NodeJS.Timeout>();

function dispatch(action: {
	type: "ADD" | "REMOVE";
	toast?: Toast;
	id?: string;
}) {
	if (action.type === "ADD" && action.toast) {
		// Remove oldest toast if limit exceeded
		if (toastState.toasts.length >= TOAST_LIMIT) {
			const oldestToast = toastState.toasts[toastState.toasts.length - 1];
			if (oldestToast) {
				const existingTimeout = timeouts.get(oldestToast.id);
				if (existingTimeout) {
					clearTimeout(existingTimeout);
					timeouts.delete(oldestToast.id);
				}
				toastState.toasts = toastState.toasts.slice(0, -1);
			}
		}

		toastState.toasts = [action.toast, ...toastState.toasts];

		// Auto-dismiss after specified duration or default
		const duration = action.toast.duration ?? TOAST_REMOVE_DELAY;
		const timeout = setTimeout(() => {
			if (action.toast?.id) {
				dismiss(action.toast.id);
			}
		}, duration);
		timeouts.set(action.toast.id, timeout);
	} else if (action.type === "REMOVE" && action.id) {
		const existingTimeout = timeouts.get(action.id);
		if (existingTimeout) {
			clearTimeout(existingTimeout);
			timeouts.delete(action.id);
		}
		toastState.toasts = toastState.toasts.filter((t) => t.id !== action.id);
	}

	for (const listener of listeners) {
		listener({ ...toastState });
	}
}

function dismiss(toastId: string) {
	dispatch({ type: "REMOVE", id: toastId });
}

function dismissAll() {
	// Clear all timeouts
	for (const timeout of timeouts.values()) {
		clearTimeout(timeout);
	}
	timeouts.clear();

	// Clear all toasts
	toastState.toasts = [];
	for (const listener of listeners) {
		listener({ ...toastState });
	}
}

export function useToast() {
	const [state, setState] = useState<ToastState>(() => ({ ...toastState }));

	useEffect(() => {
		listeners.push(setState);
		return () => {
			listeners = listeners.filter((l) => l !== setState);
		};
	}, []);

	const toast = useCallback(
		({
			title,
			description,
			variant = "default",
			action,
			duration,
		}: Omit<Toast, "id">) => {
			const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
			dispatch({
				type: "ADD",
				toast: { id, title, description, variant, action, duration },
			});
			return id;
		},
		[],
	);

	return {
		toasts: state.toasts,
		toast,
		dismiss,
		dismissAll,
		// Convenience methods for common toast types
		success: useCallback(
			(title: string, description?: string, duration?: number) =>
				toast({ title, description, variant: "success", duration }),
			[toast],
		),
		error: useCallback(
			(title: string, description?: string, duration?: number) =>
				toast({ title, description, variant: "destructive", duration }),
			[toast],
		),
		warning: useCallback(
			(title: string, description?: string, duration?: number) =>
				toast({ title, description, variant: "warning", duration }),
			[toast],
		),
		info: useCallback(
			(title: string, description?: string, duration?: number) =>
				toast({ title, description, variant: "info", duration }),
			[toast],
		),
	};
}
