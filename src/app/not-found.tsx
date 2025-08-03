import { Home, Search } from "lucide-react";
import Link from "next/link";
import { Button } from "~/components/ui/button";

export default function NotFound() {
	return (
		<div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50">
			<div className="text-center">
				{/* 404 Illustration */}
				<div className="relative mb-8">
					<h1 className="select-none font-bold text-[12rem] text-gray-200 leading-none">
						404
					</h1>
					<div className="absolute inset-0 flex items-center justify-center">
						<div className="rounded-full bg-white p-8 shadow-2xl">
							<Search className="h-16 w-16 text-indigo-600" />
						</div>
					</div>
				</div>

				{/* Error Message */}
				<h2 className="mb-4 font-bold text-3xl text-gray-900">
					Página não encontrada
				</h2>
				<p className="mx-auto mb-8 max-w-md text-gray-600 text-lg">
					Ops! Parece que você se perdeu. A página que você está procurando não
					existe ou foi movida.
				</p>

				{/* Action Buttons */}
				<div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
					<Link href="/">
						<Button size="lg" className="min-w-[200px]">
							<Home className="mr-2 h-5 w-5" />
							Voltar ao Início
						</Button>
					</Link>
					<Link href="/search">
						<Button size="lg" variant="outline" className="min-w-[200px]">
							<Search className="mr-2 h-5 w-5" />
							Buscar Serviços
						</Button>
					</Link>
				</div>

				{/* Additional Help */}
				<div className="mt-12 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
					<h3 className="mb-3 font-semibold text-gray-900">
						Páginas populares:
					</h3>
					<div className="flex flex-wrap justify-center gap-3">
						<Link
							href="/services/create"
							className="text-indigo-600 hover:underline"
						>
							Cadastrar Serviço
						</Link>
						<span className="text-gray-400">•</span>
						<Link href="/dashboard" className="text-indigo-600 hover:underline">
							Meu Dashboard
						</Link>
						<span className="text-gray-400">•</span>
						<Link href="/bookings" className="text-indigo-600 hover:underline">
							Minhas Reservas
						</Link>
						<span className="text-gray-400">•</span>
						<Link
							href="/become-professional"
							className="text-indigo-600 hover:underline"
						>
							Seja um Profissional
						</Link>
					</div>
				</div>
			</div>
		</div>
	);
}
