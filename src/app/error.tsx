"use client";

import { AlertTriangle, Home, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { Button } from "~/components/ui/button";

export default function ErrorPage({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	useEffect(() => {
		// Log the error to an error reporting service
		console.error(error);
	}, [error]);

	return (
		<div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-red-50 via-white to-orange-50 p-4">
			<div className="max-w-lg text-center">
				{/* Error Icon */}
				<div className="mb-8 flex justify-center">
					<div className="rounded-full bg-red-100 p-6 shadow-lg">
						<AlertTriangle className="h-16 w-16 text-red-600" />
					</div>
				</div>

				{/* Error Message */}
				<h1 className="mb-4 font-bold text-3xl text-gray-900">
					Ops! Algo deu errado
				</h1>
				<p className="mb-6 text-gray-600 text-lg">
					Encontramos um erro inesperado ao processar sua solicitação. Por
					favor, tente novamente.
				</p>

				{/* Error Details (Development only) */}
				{process.env.NODE_ENV === "development" && (
					<div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-left">
						<h3 className="mb-2 font-semibold text-red-800 text-sm">
							Detalhes do erro:
						</h3>
						<p className="font-mono text-red-700 text-xs">{error.message}</p>
						{error.digest && (
							<p className="mt-1 font-mono text-red-600 text-xs">
								Digest: {error.digest}
							</p>
						)}
					</div>
				)}

				{/* Action Buttons */}
				<div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
					<Button onClick={reset} size="lg" className="min-w-[160px]">
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

				{/* Help Text */}
				<p className="mt-8 text-gray-500 text-sm">
					Se o problema persistir, entre em contato com nosso suporte.
				</p>
			</div>
		</div>
	);
}
