"use client";

import {
	BanknotesIcon,
	CalendarIcon,
	ChartBarIcon,
	ClockIcon,
	CurrencyDollarIcon,
	StarIcon,
	UserGroupIcon,
} from "@heroicons/react/24/outline";
import { useState } from "react";
import { MessageButton } from "~/components/messaging/message-button";
import { api } from "~/trpc/react";

interface BookingItemProps {
	booking: {
		id: string;
		bookingDate: Date;
		status: string;
		totalPrice: number;
		service: {
			title: string;
		};
		client: {
			id: string;
			name: string | null;
			image: string | null;
		};
	};
}

function BookingItem({ booking }: BookingItemProps) {
	const acceptBooking = api.booking.accept.useMutation();
	const declineBooking = api.booking.decline.useMutation();

	const handleAccept = () => {
		acceptBooking.mutate({ bookingId: booking.id });
	};

	const handleDecline = () => {
		const reason = prompt("Motivo da recusa (opcional):");
		declineBooking.mutate({
			bookingId: booking.id,
			reason: reason || undefined,
		});
	};

	const getStatusColor = (status: string) => {
		switch (status) {
			case "pending":
				return "bg-yellow-100 text-yellow-800";
			case "accepted":
				return "bg-green-100 text-green-800";
			case "completed":
				return "bg-blue-100 text-blue-800";
			case "declined":
				return "bg-red-100 text-red-800";
			case "cancelled":
				return "bg-gray-100 text-gray-800";
			default:
				return "bg-gray-100 text-gray-800";
		}
	};

	const formatStatus = (status: string) => {
		const statusMap = {
			pending: "Pendente",
			accepted: "Aceito",
			completed: "Concluído",
			declined: "Recusado",
			cancelled: "Cancelado",
		};
		return statusMap[status as keyof typeof statusMap] || status;
	};

	return (
		<div className="rounded-lg border border-gray-200 bg-white p-4">
			<div className="mb-3 flex items-center justify-between">
				<div className="flex items-center">
					<div className="flex-shrink-0">
						<div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200">
							{booking.client.name?.[0] || "C"}
						</div>
					</div>
					<div className="ml-3">
						<p className="font-medium text-gray-900 text-sm">
							{booking.client.name || "Cliente"}
						</p>
						<p className="text-gray-500 text-sm">{booking.service.title}</p>
					</div>
				</div>
				<span
					className={`rounded-full px-2 py-1 font-medium text-xs ${getStatusColor(booking.status)}`}
				>
					{formatStatus(booking.status)}
				</span>
			</div>

			<div className="mb-3 text-gray-600 text-sm">
				<p>Data: {new Date(booking.bookingDate).toLocaleDateString("pt-BR")}</p>
				<p>
					Horário:{" "}
					{new Date(booking.bookingDate).toLocaleTimeString("pt-BR", {
						hour: "2-digit",
						minute: "2-digit",
					})}
				</p>
				<p>Valor: R$ {booking.totalPrice.toFixed(2)}</p>
			</div>

			{booking.status === "pending" && (
				<div className="space-y-2">
					<div className="flex space-x-2">
						<button
							type="button"
							onClick={handleAccept}
							disabled={acceptBooking.isPending}
							className="flex-1 rounded bg-green-600 px-3 py-2 text-sm text-white hover:bg-green-700 disabled:opacity-50"
						>
							{acceptBooking.isPending ? "Aceitando..." : "Aceitar"}
						</button>
						<button
							type="button"
							onClick={handleDecline}
							disabled={declineBooking.isPending}
							className="flex-1 rounded bg-red-600 px-3 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-50"
						>
							{declineBooking.isPending ? "Recusando..." : "Recusar"}
						</button>
					</div>
					<MessageButton
						participantId={booking.client.id}
						participantName={booking.client.name || undefined}
						bookingId={booking.id}
						className="w-full text-sm"
						variant="secondary"
					/>
				</div>
			)}
			{booking.status === "accepted" && (
				<MessageButton
					participantId={booking.client.id}
					participantName={booking.client.name || undefined}
					bookingId={booking.id}
					className="w-full text-sm"
					variant="secondary"
				/>
			)}
		</div>
	);
}

export function ProfessionalDashboard() {
	const [selectedPeriod, setSelectedPeriod] = useState<"7d" | "30d" | "90d">(
		"30d",
	);

	// Get dashboard overview
	const { data: overview, isLoading: overviewLoading } =
		api.dashboard.getOverview.useQuery();

	// Get recent bookings
	const { data: bookingsData } = api.booking.list.useQuery({
		role: "provider",
		limit: 10,
	});

	// Get earnings chart
	const { data: earningsChart } = api.dashboard.getEarningsChart.useQuery({
		months: 6,
	});

	if (overviewLoading) {
		return (
			<div className="min-h-screen bg-gray-50 py-8">
				<div className="container mx-auto px-4">
					<div className="animate-pulse">
						<div className="mb-8 h-8 rounded bg-gray-300" />
						<div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
							{Array.from({ length: 4 }, (_, i) => (
								<div
									key={`dashboard-skeleton-${crypto.randomUUID()}-${i}`}
									className="h-32 rounded-lg bg-gray-300"
								/>
							))}
						</div>
					</div>
				</div>
			</div>
		);
	}

	if (!overview) {
		return (
			<div className="min-h-screen bg-gray-50 py-8">
				<div className="container mx-auto px-4 text-center">
					<h1 className="mb-4 font-bold text-2xl text-gray-900">
						Acesso negado
					</h1>
					<p className="text-gray-600">
						Apenas profissionais verificados podem acessar o dashboard.
					</p>
				</div>
			</div>
		);
	}

	const stats = [
		{
			name: "Total de Agendamentos",
			stat: overview.bookings.total,
			icon: CalendarIcon,
			change: `${overview.bookings.growth.toFixed(1)}%`,
			changeType: overview.bookings.growth >= 0 ? "increase" : "decrease",
		},
		{
			name: "Ganhos Totais",
			stat: `R$ ${overview.earnings.total.toFixed(2)}`,
			icon: CurrencyDollarIcon,
			change: `${overview.earnings.growth.toFixed(1)}%`,
			changeType: overview.earnings.growth >= 0 ? "increase" : "decrease",
		},
		{
			name: "Saldo Disponível",
			stat: `R$ ${overview.earnings.available.toFixed(2)}`,
			icon: BanknotesIcon,
			change: "",
			changeType: "neutral",
		},
		{
			name: "Serviços Ativos",
			stat: overview.services.active,
			icon: StarIcon,
			change: `${overview.services.total} total`,
			changeType: "neutral",
		},
	];

	return (
		<div className="min-h-screen bg-gray-50 py-8">
			<div className="container mx-auto px-4">
				{/* Header */}
				<div className="mb-8">
					<h1 className="font-bold text-3xl text-gray-900">
						Dashboard Profissional
					</h1>
					<p className="text-gray-600">Gerencie seus serviços e agendamentos</p>
				</div>

				{/* Stats */}
				<div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
					{stats.map((item) => (
						<div
							key={item.name}
							className="overflow-hidden rounded-lg bg-white shadow"
						>
							<div className="p-5">
								<div className="flex items-center">
									<div className="flex-shrink-0">
										<item.icon
											className="h-6 w-6 text-gray-400"
											aria-hidden="true"
										/>
									</div>
									<div className="ml-5 w-0 flex-1">
										<dl>
											<dt className="truncate font-medium text-gray-500 text-sm">
												{item.name}
											</dt>
											<dd>
												<div className="font-medium text-gray-900 text-lg">
													{item.stat}
												</div>
											</dd>
										</dl>
									</div>
								</div>
							</div>
							{item.change && (
								<div className="bg-gray-50 px-5 py-3">
									<div className="text-sm">
										<span
											className={`font-medium ${
												item.changeType === "increase"
													? "text-green-600"
													: item.changeType === "decrease"
														? "text-red-600"
														: "text-gray-600"
											}`}
										>
											{item.change}
										</span>
										{item.changeType !== "neutral" && (
											<span className="text-gray-500"> vs. mês anterior</span>
										)}
									</div>
								</div>
							)}
						</div>
					))}
				</div>

				{/* Content Grid */}
				<div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
					{/* Recent Bookings */}
					<div className="lg:col-span-2">
						<div className="rounded-lg bg-white shadow">
							<div className="border-gray-200 border-b px-6 py-4">
								<div className="flex items-center justify-between">
									<h3 className="font-medium text-gray-900 text-lg">
										Agendamentos Recentes
									</h3>
									<span className="rounded-full bg-yellow-100 px-2 py-1 font-medium text-sm text-yellow-800">
										{overview.bookings.pending} pendentes
									</span>
								</div>
							</div>
							<div className="p-6">
								{bookingsData?.bookings && bookingsData.bookings.length > 0 ? (
									<div className="space-y-4">
										{bookingsData.bookings.map((booking) => (
											<BookingItem key={booking.id} booking={booking} />
										))}
									</div>
								) : (
									<div className="py-12 text-center text-gray-500">
										<CalendarIcon className="mx-auto mb-4 h-12 w-12" />
										<p>Nenhum agendamento encontrado</p>
									</div>
								)}
							</div>
						</div>
					</div>

					{/* Quick Actions */}
					<div className="space-y-6">
						{/* Earnings Chart */}
						<div className="rounded-lg bg-white p-6 shadow">
							<h3 className="mb-4 font-medium text-gray-900 text-lg">
								Ganhos dos Últimos 6 Meses
							</h3>
							{earningsChart && earningsChart.length > 0 ? (
								<div className="space-y-2">
									{earningsChart.map((data) => (
										<div
											key={data.month}
											className="flex justify-between text-sm"
										>
											<span className="text-gray-600">
												{new Date(data.month).toLocaleDateString("pt-BR", {
													month: "short",
													year: "numeric",
												})}
											</span>
											<span className="font-medium">
												R$ {data.earnings.toFixed(2)}
											</span>
										</div>
									))}
								</div>
							) : (
								<p className="py-4 text-center text-gray-500">
									Sem dados de ganhos ainda
								</p>
							)}
						</div>

						{/* Quick Actions */}
						<div className="rounded-lg bg-white p-6 shadow">
							<h3 className="mb-4 font-medium text-gray-900 text-lg">
								Ações Rápidas
							</h3>
							<div className="space-y-3">
								<a
									href="/services/create"
									className="block w-full rounded-lg bg-indigo-600 px-4 py-2 text-center text-white hover:bg-indigo-700"
								>
									Criar Novo Serviço
								</a>
								<a
									href="/dashboard/services"
									className="block w-full rounded-lg bg-gray-600 px-4 py-2 text-center text-white hover:bg-gray-700"
								>
									Gerenciar Serviços
								</a>
								<a
									href="/dashboard/earnings"
									className="block w-full rounded-lg bg-green-600 px-4 py-2 text-center text-white hover:bg-green-700"
								>
									Ver Ganhos
								</a>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
