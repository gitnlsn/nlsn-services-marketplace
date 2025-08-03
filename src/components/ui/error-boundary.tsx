"use client";

import React from "react";
import { Button } from "./button";
import { Card, CardContent } from "./card";

interface ErrorBoundaryState {
	hasError: boolean;
	error?: Error;
	errorInfo?: React.ErrorInfo;
}

interface ErrorBoundaryProps {
	children: React.ReactNode;
	fallback?: React.ComponentType<{
		error?: Error;
		resetError: () => void;
	}>;
	onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

export class ErrorBoundary extends React.Component<
	ErrorBoundaryProps,
	ErrorBoundaryState
> {
	constructor(props: ErrorBoundaryProps) {
		super(props);
		this.state = { hasError: false };
	}

	static getDerivedStateFromError(error: Error): ErrorBoundaryState {
		return {
			hasError: true,
			error,
		};
	}

	componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
		this.setState({
			error,
			errorInfo,
		});

		// Log error to external service
		console.error("ErrorBoundary caught an error:", error, errorInfo);

		// Call custom error handler if provided
		if (this.props.onError) {
			this.props.onError(error, errorInfo);
		}
	}

	resetError = () => {
		this.setState({ hasError: false, error: undefined, errorInfo: undefined });
	};

	render() {
		if (this.state.hasError) {
			if (this.props.fallback) {
				const FallbackComponent = this.props.fallback;
				return (
					<FallbackComponent
						error={this.state.error}
						resetError={this.resetError}
					/>
				);
			}

			return (
				<DefaultErrorFallback
					error={this.state.error}
					resetError={this.resetError}
				/>
			);
		}

		return this.props.children;
	}
}

function DefaultErrorFallback({
	error,
	resetError,
}: {
	error?: Error;
	resetError: () => void;
}) {
	return (
		<div className="container-md section-spacing">
			<Card>
				<CardContent className="card-padding text-center">
					<div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
						<svg
							className="h-8 w-8 text-red-600"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							role="img"
							aria-label="Error icon"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.232 16.5c-.77.833.192 2.5 1.732 2.5z"
							/>
						</svg>
					</div>

					<h2 className="mb-2 font-semibold text-gray-900 text-xl">
						Oops! Algo deu errado
					</h2>

					<p className="mb-6 text-gray-600">
						Ocorreu um erro inesperado. Nossa equipe foi notificada e está
						trabalhando para resolver o problema.
					</p>

					{process.env.NODE_ENV === "development" && error && (
						<details className="mb-6 rounded-lg bg-gray-100 p-4 text-left text-sm">
							<summary className="cursor-pointer font-medium text-gray-800">
								Detalhes do erro (desenvolvimento)
							</summary>
							<pre className="mt-2 overflow-auto text-red-600">
								{error.message}
								{error.stack && (
									<>
										{"\n\n"}
										{error.stack}
									</>
								)}
							</pre>
						</details>
					)}

					<div className="button-group justify-center">
						<Button onClick={resetError}>Tentar novamente</Button>
						<Button variant="outline" onClick={() => window.location.reload()}>
							Recarregar página
						</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}

// Higher-order component to wrap components with error boundary
export function withErrorBoundary<P extends object>(
	Component: React.ComponentType<P>,
	fallback?: React.ComponentType<{
		error?: Error;
		resetError: () => void;
	}>,
) {
	const WrappedComponent = (props: P) => (
		<ErrorBoundary fallback={fallback}>
			<Component {...props} />
		</ErrorBoundary>
	);

	WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

	return WrappedComponent;
}

// Specific error boundaries for different sections
export function PageErrorBoundary({ children }: { children: React.ReactNode }) {
	return (
		<ErrorBoundary
			fallback={({ error, resetError }) => (
				<div className="container-lg section-spacing-lg">
					<DefaultErrorFallback error={error} resetError={resetError} />
				</div>
			)}
		>
			{children}
		</ErrorBoundary>
	);
}

export function CardErrorBoundary({ children }: { children: React.ReactNode }) {
	return (
		<ErrorBoundary
			fallback={({ resetError }) => (
				<Card>
					<CardContent className="card-padding text-center">
						<div className="stack-spacing-sm">
							<div className="text-red-600">
								<svg
									className="mx-auto h-8 w-8"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
									role="img"
									aria-label="Error icon"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M12 9v2m0 4h.01M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
									/>
								</svg>
							</div>

							<p className="text-gray-600 text-sm">
								Erro ao carregar este conteúdo
							</p>

							<Button size="sm" variant="outline" onClick={resetError}>
								Tentar novamente
							</Button>
						</div>
					</CardContent>
				</Card>
			)}
		>
			{children}
		</ErrorBoundary>
	);
}
