"use client";

import {
	BanknotesIcon,
	CheckCircleIcon,
	ClockIcon,
	CurrencyDollarIcon,
} from "@heroicons/react/24/outline";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Loading } from "~/components/ui/loading";
import { api } from "~/trpc/react";

export default function EarningsPage() {
	const [selectedPeriod, setSelectedPeriod] = useState<
		"week" | "month" | "year"
	>("month");

	const { data: earnings, isLoading } = api.dashboard.getEarnings.useQuery({
		period: selectedPeriod,
	});

	const { data: withdrawals } = api.dashboard.getWithdrawals.useQuery({
		limit: 10,
	});

	const requestWithdrawal = api.dashboard.requestWithdrawal.useMutation({
		onSuccess: () => {
			alert("Solicitação de saque realizada com sucesso!");
		},
		onError: (error) => {
			alert(`Erro ao solicitar saque: ${error.message}`);
		},
	});

	if (isLoading) {
		return (
			<Loading className="min-h-screen" size="lg" text="Carregando ganhos..." />
		);
	}

	if (!earnings) {
		return (
			<div className="min-h-screen bg-gray-50 py-8">
				<div className="container mx-auto px-4 text-center">
					<h1 className="mb-4 font-bold text-2xl text-gray-900">
						Erro ao carregar ganhos
					</h1>
					<p className="text-gray-600">Tente novamente mais tarde.</p>
				</div>
			</div>
		);
	}

	const handleWithdrawal = () => {
		if (earnings.available < 10) {
			alert("O valor mínimo para saque é R$ 10,00");
			return;
		}

		const amount = prompt(
			`Digite o valor do saque (máximo: R$ ${earnings.available.toFixed(2)})`,
		);
		if (!amount) return;

		const parsedAmount = Number.parseFloat(amount);
		if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
			alert("Valor inválido");
			return;
		}

		if (parsedAmount > earnings.available) {
			alert("Valor maior que o saldo disponível");
			return;
		}

		if (parsedAmount < 10) {
			alert("O valor mínimo para saque é R$ 10,00");
			return;
		}

		requestWithdrawal.mutate({ amount: parsedAmount });
	};

	const formatCurrency = (value: number) => `R$ ${value.toFixed(2)}`;

	const formatDate = (date: string | Date) => {
		return new Date(date).toLocaleDateString("pt-BR", {
			day: "2-digit",
			month: "2-digit",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	const getStatusBadge = (status: string) => {
		const statusConfig = {
			pending: { label: "Pendente", variant: "secondary" as const },
			processing: { label: "Processando", variant: "secondary" as const },
			completed: { label: "Concluído", variant: "default" as const },
			failed: { label: "Falhou", variant: "destructive" as const },
		};

		const config = statusConfig[status as keyof typeof statusConfig] || {
			label: status,
			variant: "secondary" as const,
		};

		const variantClasses = {
			default: "bg-green-100 text-green-800",
			destructive: "bg-red-100 text-red-800",
			secondary: "bg-gray-100 text-gray-800",
		};

		return (
			<span
				className={`inline-flex items-center rounded-full px-2.5 py-0.5 font-medium text-xs ${
					variantClasses[config.variant] || "bg-gray-100 text-gray-800"
				}`}
			>
				{config.label}
			</span>
		);
	};

	return (
		<main className="min-h-screen bg-gray-50 py-8">
			<div className="container mx-auto px-4">
				<div className="mb-8">
					<h1 className="font-bold text-3xl text-gray-900">Meus Ganhos</h1>
					<p className="text-gray-600">
						Acompanhe seus ganhos e solicite saques
					</p>
				</div>

				{/* Period Selector */}
				<div className="mb-6 flex gap-2">
					<Button
						variant={selectedPeriod === "week" ? "default" : "outline"}
						size="sm"
						onClick={() => setSelectedPeriod("week")}
					>
						Semana
					</Button>
					<Button
						variant={selectedPeriod === "month" ? "default" : "outline"}
						size="sm"
						onClick={() => setSelectedPeriod("month")}
					>
						Mês
					</Button>
					<Button
						variant={selectedPeriod === "year" ? "default" : "outline"}
						size="sm"
						onClick={() => setSelectedPeriod("year")}
					>
						Ano
					</Button>
				</div>

				{/* Summary Cards */}
				<div className="mb-8 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
					<Card>
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="font-medium text-sm">
								Ganhos Totais
							</CardTitle>
							<CurrencyDollarIcon className="h-4 w-4 text-muted-foreground" />
						</CardHeader>
						<CardContent>
							<div className="font-bold text-2xl">
								{formatCurrency(earnings.total)}
							</div>
							<p className="text-muted-foreground text-xs">
								No período selecionado
							</p>
						</CardContent>
					</Card>

					<Card>
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="font-medium text-sm">
								Saldo Disponível
							</CardTitle>
							<BanknotesIcon className="h-4 w-4 text-muted-foreground" />
						</CardHeader>
						<CardContent>
							<div className="font-bold text-2xl">
								{formatCurrency(earnings.available)}
							</div>
							<p className="text-muted-foreground text-xs">Pronto para saque</p>
						</CardContent>
					</Card>

					<Card>
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="font-medium text-sm">Em Escrow</CardTitle>
							<ClockIcon className="h-4 w-4 text-muted-foreground" />
						</CardHeader>
						<CardContent>
							<div className="font-bold text-2xl">
								{formatCurrency(earnings.pending)}
							</div>
							<p className="text-muted-foreground text-xs">
								Aguardando liberação
							</p>
						</CardContent>
					</Card>

					<Card>
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="font-medium text-sm">
								Taxa da Plataforma
							</CardTitle>
							<CheckCircleIcon className="h-4 w-4 text-muted-foreground" />
						</CardHeader>
						<CardContent>
							<div className="font-bold text-2xl">
								{formatCurrency(earnings.fees)}
							</div>
							<p className="text-muted-foreground text-xs">10% dos ganhos</p>
						</CardContent>
					</Card>
				</div>

				<div className="grid gap-8 lg:grid-cols-2">
					{/* Withdrawal Section */}
					<Card>
						<CardHeader>
							<CardTitle>Solicitar Saque</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="space-y-4">
								<div className="rounded-lg bg-gray-50 p-4">
									<p className="mb-2 text-gray-600 text-sm">
										Saldo disponível para saque:
									</p>
									<p className="font-bold text-3xl text-indigo-600">
										{formatCurrency(earnings.available)}
									</p>
								</div>

								<div className="space-y-2 text-gray-600 text-sm">
									<p>• Valor mínimo para saque: R$ 10,00</p>
									<p>• Prazo de processamento: 2-3 dias úteis</p>
									<p>• Taxa de saque: Grátis</p>
								</div>

								<Button
									className="w-full"
									onClick={handleWithdrawal}
									disabled={
										earnings.available < 10 || requestWithdrawal.isPending
									}
								>
									{requestWithdrawal.isPending
										? "Processando..."
										: "Solicitar Saque"}
								</Button>
							</div>
						</CardContent>
					</Card>

					{/* Recent Withdrawals */}
					<Card>
						<CardHeader>
							<CardTitle>Saques Recentes</CardTitle>
						</CardHeader>
						<CardContent>
							{withdrawals?.withdrawals &&
							withdrawals.withdrawals.length > 0 ? (
								<div className="space-y-3">
									{withdrawals.withdrawals.map((withdrawal) => (
										<div
											key={withdrawal.id}
											className="flex items-center justify-between border-b py-2 last:border-0"
										>
											<div className="flex-1">
												<p className="font-medium">
													{formatCurrency(withdrawal.amount)}
												</p>
												<p className="text-gray-500 text-xs">
													{formatDate(withdrawal.createdAt)}
												</p>
											</div>
											<div>{getStatusBadge(withdrawal.status)}</div>
										</div>
									))}
								</div>
							) : (
								<p className="py-8 text-center text-gray-500">
									Nenhum saque realizado ainda
								</p>
							)}
						</CardContent>
					</Card>
				</div>

				{/* Transaction History */}
				<Card className="mt-8">
					<CardHeader>
						<CardTitle>Histórico de Transações</CardTitle>
					</CardHeader>
					<CardContent>
						{earnings.transactions && earnings.transactions.length > 0 ? (
							<div className="overflow-x-auto">
								<table className="min-w-full divide-y divide-gray-200">
									<thead className="bg-gray-50">
										<tr>
											<th className="px-6 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider">
												Data
											</th>
											<th className="px-6 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider">
												Descrição
											</th>
											<th className="px-6 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider">
												Cliente
											</th>
											<th className="px-6 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider">
												Valor
											</th>
											<th className="px-6 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider">
												Status
											</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-gray-200 bg-white">
										{earnings.transactions.map((transaction) => (
											<tr key={transaction.id}>
												<td className="whitespace-nowrap px-6 py-4 text-gray-900 text-sm">
													{formatDate(transaction.date)}
												</td>
												<td className="whitespace-nowrap px-6 py-4 text-gray-900 text-sm">
													{transaction.description}
												</td>
												<td className="whitespace-nowrap px-6 py-4 text-gray-900 text-sm">
													{transaction.clientName}
												</td>
												<td className="whitespace-nowrap px-6 py-4 font-medium text-gray-900 text-sm">
													{formatCurrency(transaction.amount)}
												</td>
												<td className="whitespace-nowrap px-6 py-4">
													{getStatusBadge(transaction.status)}
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						) : (
							<p className="py-8 text-center text-gray-500">
								Nenhuma transação no período selecionado
							</p>
						)}
					</CardContent>
				</Card>
			</div>
		</main>
	);
}
