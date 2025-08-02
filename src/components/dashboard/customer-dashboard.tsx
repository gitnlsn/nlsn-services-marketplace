"use client";

import { Calendar, Clock, CreditCard, MapPin, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { api } from "~/trpc/react";

export function CustomerDashboard() {
	const [activeTab, setActiveTab] = useState("bookings");

	const { data: bookings, isLoading: bookingsLoading } =
		api.booking.list.useQuery({
			role: "client",
			limit: 20,
		});

	const { data: userData } = api.user.getCurrentUser.useQuery();

	const formatDate = (date: Date) => {
		return new Intl.DateTimeFormat("pt-BR", {
			day: "2-digit",
			month: "2-digit",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		}).format(new Date(date));
	};

	const getStatusBadge = (status: string) => {
		const statusConfig = {
			pending: {
				label: "Pendente",
				className: "bg-yellow-100 text-yellow-800",
			},
			accepted: { label: "Aceito", className: "bg-blue-100 text-blue-800" },
			declined: { label: "Recusado", className: "bg-red-100 text-red-800" },
			completed: {
				label: "Concluído",
				className: "bg-green-100 text-green-800",
			},
			cancelled: { label: "Cancelado", className: "bg-gray-100 text-gray-800" },
		};

		const config = statusConfig[status as keyof typeof statusConfig] || {
			label: status,
			className: "bg-gray-100 text-gray-800",
		};

		return <Badge className={config.className}>{config.label}</Badge>;
	};

	const formatPrice = (price: number) => {
		return new Intl.NumberFormat("pt-BR", {
			style: "currency",
			currency: "BRL",
		}).format(price);
	};

	if (bookingsLoading) {
		return (
			<div className="container mx-auto px-4 py-8">
				<div className="animate-pulse">
					<div className="mb-8 h-8 w-64 rounded bg-gray-200" />
					<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
						{Array.from({ length: 6 }).map(() => (
							<Card key={crypto.randomUUID()}>
								<CardContent className="p-4">
									<div className="mb-2 h-4 rounded bg-gray-200" />
									<div className="mb-2 h-3 w-3/4 rounded bg-gray-200" />
									<div className="h-3 w-1/2 rounded bg-gray-200" />
								</CardContent>
							</Card>
						))}
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="container mx-auto px-4 py-8">
			{/* Header */}
			<div className="mb-8">
				<h1 className="mb-2 font-bold text-3xl text-gray-900">Meu Dashboard</h1>
				<p className="text-gray-600">
					Acompanhe seus agendamentos e atividades
				</p>
			</div>

			{/* Stats Overview */}
			<div className="mb-8 grid gap-4 md:grid-cols-4">
				<Card>
					<CardContent className="p-6">
						<div className="flex items-center space-x-2">
							<Calendar className="h-8 w-8 text-blue-600" />
							<div>
								<p className="font-bold text-2xl">
									{bookings?.bookings?.filter((b) => b.status === "pending")
										.length || 0}
								</p>
								<p className="text-gray-600 text-sm">Pendentes</p>
							</div>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardContent className="p-6">
						<div className="flex items-center space-x-2">
							<Clock className="h-8 w-8 text-green-600" />
							<div>
								<p className="font-bold text-2xl">
									{bookings?.bookings?.filter((b) => b.status === "accepted")
										.length || 0}
								</p>
								<p className="text-gray-600 text-sm">Confirmados</p>
							</div>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardContent className="p-6">
						<div className="flex items-center space-x-2">
							<Star className="h-8 w-8 text-yellow-600" />
							<div>
								<p className="font-bold text-2xl">
									{bookings?.bookings?.filter((b) => b.status === "completed")
										.length || 0}
								</p>
								<p className="text-gray-600 text-sm">Concluídos</p>
							</div>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardContent className="p-6">
						<div className="flex items-center space-x-2">
							<CreditCard className="h-8 w-8 text-purple-600" />
							<div>
								<p className="font-bold text-2xl">
									{formatPrice(
										bookings?.bookings?.reduce(
											(sum, b) => sum + (b.totalPrice || 0),
											0,
										) || 0,
									)}
								</p>
								<p className="text-gray-600 text-sm">Total Gasto</p>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Main Content */}
			<div className="space-y-6">
				{/* Recent Bookings */}
				<Card>
					<CardHeader>
						<CardTitle>Meus Agendamentos</CardTitle>
					</CardHeader>
					<CardContent>
						{bookings?.bookings && bookings.bookings.length > 0 ? (
							<div className="space-y-4">
								{bookings.bookings.map((booking) => (
									<div
										key={booking.id}
										className="flex items-center justify-between rounded-lg border p-4"
									>
										<div className="flex items-center space-x-4">
											{booking.service.images?.[0] ? (
												<div className="relative h-16 w-16 overflow-hidden rounded-lg">
													<Image
														src={booking.service.images[0].url}
														alt={booking.service.title}
														fill
														className="object-cover"
													/>
												</div>
											) : (
												<div className="flex h-16 w-16 items-center justify-center rounded-lg bg-gradient-to-br from-blue-100 to-indigo-100">
													<span className="font-semibold text-indigo-600 text-xl">
														{booking.service.category.name.charAt(0)}
													</span>
												</div>
											)}

											<div className="flex-1">
												<h3 className="font-semibold text-gray-900">
													{booking.service.title}
												</h3>
												<p className="text-gray-600 text-sm">
													com {booking.provider.name}
												</p>
												<div className="mt-1 flex items-center space-x-4 text-gray-500 text-sm">
													<div className="flex items-center space-x-1">
														<Calendar className="h-4 w-4" />
														<span>{formatDate(booking.bookingDate)}</span>
													</div>
													{booking.address && (
														<div className="flex items-center space-x-1">
															<MapPin className="h-4 w-4" />
															<span>{booking.address}</span>
														</div>
													)}
												</div>
											</div>
										</div>

										<div className="flex items-center space-x-4">
											<div className="text-right">
												<p className="font-semibold text-gray-900">
													{formatPrice(booking.totalPrice)}
												</p>
												{getStatusBadge(booking.status)}
											</div>

											<div className="flex flex-col space-y-2">
												<Link href={`/services/${booking.service.id}`}>
													<Button variant="outline" size="sm">
														Ver Serviço
													</Button>
												</Link>

												{booking.status === "completed" && (
													<Button variant="outline" size="sm">
														Avaliar
													</Button>
												)}
											</div>
										</div>
									</div>
								))}
							</div>
						) : (
							<div className="py-12 text-center">
								<Calendar className="mx-auto mb-4 h-12 w-12 text-gray-400" />
								<h3 className="mb-2 font-semibold text-gray-900 text-lg">
									Nenhum agendamento encontrado
								</h3>
								<p className="mb-6 text-gray-600">
									Você ainda não fez nenhum agendamento. Explore nossos
									serviços!
								</p>
								<Link href="/search">
									<Button>Encontrar Serviços</Button>
								</Link>
							</div>
						)}
					</CardContent>
				</Card>

				{/* Quick Actions */}
				<div className="grid gap-4 md:grid-cols-3">
					<Card className="cursor-pointer transition-all hover:shadow-lg">
						<Link href="/search">
							<CardContent className="p-6 text-center">
								<div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
									<Calendar className="h-6 w-6 text-blue-600" />
								</div>
								<h3 className="mb-2 font-semibold text-gray-900">
									Agendar Serviço
								</h3>
								<p className="text-gray-600 text-sm">
									Encontre profissionais para suas necessidades
								</p>
							</CardContent>
						</Link>
					</Card>

					<Card className="cursor-pointer transition-all hover:shadow-lg">
						<Link href="/profile">
							<CardContent className="p-6 text-center">
								<div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
									<Star className="h-6 w-6 text-green-600" />
								</div>
								<h3 className="mb-2 font-semibold text-gray-900">Meu Perfil</h3>
								<p className="text-gray-600 text-sm">
									Gerencie suas informações pessoais
								</p>
							</CardContent>
						</Link>
					</Card>

					<Card className="cursor-pointer transition-all hover:shadow-lg">
						<Link href="/become-professional">
							<CardContent className="p-6 text-center">
								<div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-purple-100">
									<CreditCard className="h-6 w-6 text-purple-600" />
								</div>
								<h3 className="mb-2 font-semibold text-gray-900">
									Seja um Profissional
								</h3>
								<p className="text-gray-600 text-sm">
									Ofereça seus serviços na plataforma
								</p>
							</CardContent>
						</Link>
					</Card>
				</div>
			</div>
		</div>
	);
}
