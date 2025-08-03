"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface DynamicImportState<T> {
	component: T | null;
	loading: boolean;
	error: Error | null;
}

/**
 * Hook for managing dynamic imports with loading states
 */
export function useDynamicImport<T = unknown>(
	importFunction: () => Promise<{ default: T }>,
	dependencies: unknown[] = [],
) {
	const [state, setState] = useState<DynamicImportState<T>>({
		component: null,
		loading: false,
		error: null,
	});

	const loadComponent = useCallback(async () => {
		setState((prev) => ({ ...prev, loading: true, error: null }));

		try {
			const module = await importFunction();
			setState({
				component: module.default,
				loading: false,
				error: null,
			});
		} catch (error) {
			setState({
				component: null,
				loading: false,
				error: error as Error,
			});
		}
	}, [importFunction, ...dependencies]);

	useEffect(() => {
		loadComponent();
	}, [loadComponent]);

	return {
		...state,
		reload: loadComponent,
	};
}

/**
 * Hook for lazy loading components on demand
 */
export function useLazyImport<T = unknown>(
	importFunction: () => Promise<{ default: T }>,
) {
	const [state, setState] = useState<DynamicImportState<T>>({
		component: null,
		loading: false,
		error: null,
	});

	const loadComponent = useCallback(async () => {
		if (state.component || state.loading) return; // Already loaded or loading

		setState((prev) => ({ ...prev, loading: true, error: null }));

		try {
			const module = await importFunction();
			setState({
				component: module.default,
				loading: false,
				error: null,
			});
		} catch (error) {
			setState({
				component: null,
				loading: false,
				error: error as Error,
			});
		}
	}, [importFunction, state.component, state.loading]);

	return {
		...state,
		load: loadComponent,
	};
}

/**
 * Hook for preloading components without rendering them
 */
export function usePreload() {
	const preloadedModulesRef = useRef(new Map<string, Promise<unknown>>());

	const preload = useCallback(
		(key: string, importFunction: () => Promise<unknown>) => {
			const preloadedModules = preloadedModulesRef.current;
			if (!preloadedModules.has(key)) {
				const modulePromise = importFunction();
				preloadedModules.set(key, modulePromise);
			}
			return preloadedModules.get(key);
		},
		[],
	);

	const getPreloaded = useCallback((key: string) => {
		return preloadedModulesRef.current.get(key);
	}, []);

	return { preload, getPreloaded };
}

/**
 * Hook for conditional loading based on feature flags or user state
 */
export function useConditionalImport<T = unknown>(
	importFunction: () => Promise<{ default: T }>,
	condition: boolean,
	dependencies: unknown[] = [],
) {
	const [state, setState] = useState<DynamicImportState<T>>({
		component: null,
		loading: false,
		error: null,
	});

	useEffect(() => {
		if (!condition) return;

		setState((prev) => ({ ...prev, loading: true, error: null }));

		importFunction()
			.then((module) => {
				setState({
					component: module.default,
					loading: false,
					error: null,
				});
			})
			.catch((error) => {
				setState({
					component: null,
					loading: false,
					error: error as Error,
				});
			});
	}, [condition, importFunction, ...dependencies]);

	return state;
}

/**
 * Hook for intersection-based lazy loading
 */
export function useIntersectionLazyLoad<T = unknown>(
	importFunction: () => Promise<{ default: T }>,
	options: IntersectionObserverInit = { threshold: 0.1 },
) {
	const [state, setState] = useState<DynamicImportState<T>>({
		component: null,
		loading: false,
		error: null,
	});
	const [ref, setRef] = useState<Element | null>(null);

	useEffect(() => {
		if (!ref || typeof window === "undefined") return;

		const observer = new IntersectionObserver((entries) => {
			for (const entry of entries) {
				if (entry.isIntersecting && !state.component && !state.loading) {
					setState((prev) => ({ ...prev, loading: true, error: null }));

					importFunction()
						.then((module) => {
							setState({
								component: module.default,
								loading: false,
								error: null,
							});
						})
						.catch((error) => {
							setState({
								component: null,
								loading: false,
								error: error as Error,
							});
						});

					observer.disconnect();
				}
			}
		}, options);

		observer.observe(ref);

		return () => observer.disconnect();
	}, [ref, importFunction, state.component, state.loading, options]);

	return {
		...state,
		ref: setRef,
	};
}
