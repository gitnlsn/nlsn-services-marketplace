"use client";

import { AlertTriangle, Home } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { Button } from "~/components/ui/button";

export default function GlobalError({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	useEffect(() => {
		// Log the error to an error reporting service
		console.error("Global error:", error);
	}, [error]);

	return (
		<html lang="en">
			<body>
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
							Erro Crítico do Sistema
						</h1>
						<p className="mb-6 text-gray-600 text-lg">
							Encontramos um erro crítico que impediu o carregamento da
							aplicação. Nossa equipe foi notificada e está trabalhando para
							resolver o problema.
						</p>

						{/* Error Details (Development only) */}
						{process.env.NODE_ENV === "development" && (
							<div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-left">
								<h3 className="mb-2 font-semibold text-red-800 text-sm">
									Detalhes do erro:
								</h3>
								<p className="break-words font-mono text-red-700 text-xs">
									{error.message}
								</p>
								{error.digest && (
									<p className="mt-1 font-mono text-red-600 text-xs">
										Digest: {error.digest}
									</p>
								)}
								{error.stack && (
									<details className="mt-2">
										<summary className="cursor-pointer font-semibold text-red-800 text-xs">
											Stack Trace
										</summary>
										<pre className="mt-1 whitespace-pre-wrap font-mono text-red-700 text-xs">
											{error.stack}
										</pre>
									</details>
								)}
							</div>
						)}

						{/* Action Buttons */}
						<div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
							<Button onClick={reset} size="lg" className="min-w-[160px]">
								Recarregar Aplicação
							</Button>
							<Button
								onClick={() => {
									window.location.href = "/";
								}}
								size="lg"
								variant="outline"
								className="min-w-[160px]"
							>
								<Home className="mr-2 h-5 w-5" />
								Página Inicial
							</Button>
						</div>

						{/* Help Text */}
						<div className="mt-8 space-y-2">
							<p className="text-gray-500 text-sm">
								Se o problema persistir, tente:
							</p>
							<ul className="text-gray-500 text-sm">
								<li>• Limpar cache e cookies do navegador</li>
								<li>• Atualizar a página (F5 ou Ctrl+R)</li>
								<li>• Entrar em contato com nosso suporte</li>
							</ul>
						</div>
					</div>
				</div>
			</body>
		</html>
	);
}
