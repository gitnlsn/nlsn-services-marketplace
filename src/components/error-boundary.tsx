"use client";

import { AlertTriangle, Home, RefreshCw } from "lucide-react";
import Link from "next/link";
import React from "react";
import { Button } from "~/components/ui/button";

interface ErrorBoundaryProps {
	children: React.ReactNode;
}

interface ErrorBoundaryState {
	hasError: boolean;
	error: Error | null;
}

export class ErrorBoundary extends React.Component<
	ErrorBoundaryProps,
	ErrorBoundaryState
> {
	constructor(props: ErrorBoundaryProps) {
		super(props);
		this.state = { hasError: false, error: null };
	}

	static getDerivedStateFromError(error: Error): ErrorBoundaryState {
		return { hasError: true, error };
	}

	componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
		console.error("Error caught by boundary:", error, errorInfo);
	}

	handleReset = () => {
		this.setState({ hasError: false, error: null });
	};

	render() {
		if (this.state.hasError) {
			return (
				<div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-red-50 via-white to-orange-50 p-4">
					<div className="max-w-lg text-center">
						{/* Error Icon */}
						<div className="mb-8 flex justify-center">
							<div className="rounded-full bg-red-100 p-6">
								<AlertTriangle className="h-16 w-16 text-red-600" />
							</div>
						</div>

						{/* Error Message */}
						<h1 className="mb-4 font-bold text-3xl text-gray-900">
							Ops! Algo deu errado
						</h1>
						<p className="mb-6 text-gray-600">
							Encontramos um erro inesperado. Por favor, tente novamente ou
							volte para a página inicial.
						</p>

						{/* Error Details (Development only) */}
						{process.env.NODE_ENV === "development" && this.state.error && (
							<div className="mb-6 rounded-lg bg-gray-100 p-4 text-left">
								<p className="font-mono text-red-600 text-sm">
									{this.state.error.message}
								</p>
							</div>
						)}

						{/* Action Buttons */}
						<div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
							<Button
								onClick={this.handleReset}
								size="lg"
								className="min-w-[160px]"
							>
								<RefreshCw className="mr-2 h-5 w-5" />
								Tentar Novamente
							</Button>
							<Link href="/">
								<Button
									size="lg"
									variant="outline"
									className="w-full min-w-[160px]"
								>
									<Home className="mr-2 h-5 w-5" />
									Página Inicial
								</Button>
							</Link>
						</div>
					</div>
				</div>
			);
		}

		return this.props.children;
	}
}
