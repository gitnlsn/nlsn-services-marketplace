"use client";

import { Calendar, Clock, CreditCard, MapPin, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ReviewModal } from "~/components/review/review-modal";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { api } from "~/trpc/react";

export function CustomerDashboard() {
	const [activeTab, setActiveTab] = useState("upcoming");
	const [reviewModalOpen, setReviewModalOpen] = useState(false);
	const [selectedBooking, setSelectedBooking] = useState<{
		id: string;
		serviceId: string;
		serviceName: string;
	} | null>(null);

	const {
		data: bookings,
		isLoading: bookingsLoading,
		refetch,
	} = api.booking.list.useQuery({
		role: "client",
		limit: 20,
	});

	const { data: userData } = api.user.getCurrentUser.useQuery();

	const cancelBooking = api.booking.updateStatus.useMutation({
		onSuccess: () => {
			// Refetch bookings after cancellation
			void refetch();
		},
	});

	const handleCancelBooking = (bookingId: string) => {
		const reason = prompt("Motivo do cancelamento (opcional):");
		if (confirm("Tem certeza que deseja cancelar este agendamento?")) {
			cancelBooking.mutate({
				bookingId,
				status: "cancelled",
				reason: reason || undefined,
			});
		}
	};

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

	const filterBookingsByStatus = (
		status: "upcoming" | "past" | "cancelled",
	) => {
		if (!bookings?.bookings) return [];

		switch (status) {
			case "upcoming":
				return bookings.bookings.filter(
					(b) => b.status === "pending" || b.status === "accepted",
				);
			case "past":
				return bookings.bookings.filter((b) => b.status === "completed");
			case "cancelled":
				return bookings.bookings.filter(
					(b) => b.status === "cancelled" || b.status === "declined",
				);
			default:
				return [];
		}
	};

	type BookingType = NonNullable<typeof bookings>["bookings"][0];

	const canCancelBooking = (booking: BookingType) => {
		if (booking.status !== "pending" && booking.status !== "accepted") {
			return false;
		}
		// Can cancel if booking is more than 24 hours away
		const bookingDate = new Date(booking.bookingDate);
		const now = new Date();
		const hoursUntilBooking =
			(bookingDate.getTime() - now.getTime()) / (1000 * 60 * 60);
		return hoursUntilBooking > 24;
	};

	const renderBookingActions = (booking: BookingType) => {
		const actions = [];

		// Always show "Ver Serviço" button
		actions.push(
			<Link key="view" href={`/services/${booking.service.id}`}>
				<Button variant="outline" size="sm">
					Ver Serviço
				</Button>
			</Link>,
		);

		// Cancel button for pending/accepted bookings
		if (canCancelBooking(booking)) {
			actions.push(
				<Button
					key="cancel"
					variant="destructive"
					size="sm"
					onClick={() => handleCancelBooking(booking.id)}
					disabled={cancelBooking.isPending}
				>
					{cancelBooking.isPending ? "Cancelando..." : "Cancelar"}
				</Button>,
			);
		}

		// Review button for completed bookings
		if (booking.status === "completed") {
			actions.push(
				<Button
					key="review"
					variant="outline"
					size="sm"
					onClick={() => {
						setSelectedBooking({
							id: booking.id,
							serviceId: booking.service.id,
							serviceName: booking.service.title,
						});
						setReviewModalOpen(true);
					}}
				>
					Avaliar
				</Button>,
			);
		}

		return <div className="flex flex-col space-y-2">{actions}</div>;
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
				{/* Bookings with Tabs */}
				<Card>
					<CardHeader>
						<CardTitle>Meus Agendamentos</CardTitle>
					</CardHeader>
					<CardContent>
						<Tabs
							value={activeTab}
							onValueChange={setActiveTab}
							className="w-full"
						>
							<TabsList className="grid w-full grid-cols-3">
								<TabsTrigger value="upcoming">
									Próximos ({filterBookingsByStatus("upcoming").length})
								</TabsTrigger>
								<TabsTrigger value="past">
									Concluídos ({filterBookingsByStatus("past").length})
								</TabsTrigger>
								<TabsTrigger value="cancelled">
									Cancelados ({filterBookingsByStatus("cancelled").length})
								</TabsTrigger>
							</TabsList>

							<TabsContent value="upcoming" className="mt-6">
								{filterBookingsByStatus("upcoming").length > 0 ? (
									<div className="space-y-4">
										{filterBookingsByStatus("upcoming").map((booking) => (
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
													{renderBookingActions(booking)}
												</div>
											</div>
										))}
									</div>
								) : (
									<div className="py-12 text-center">
										<Calendar className="mx-auto mb-4 h-12 w-12 text-gray-400" />
										<h3 className="mb-2 font-semibold text-gray-900 text-lg">
											Nenhum agendamento próximo
										</h3>
										<p className="mb-6 text-gray-600">
											Você não possui agendamentos pendentes ou confirmados.
										</p>
										<Link href="/search">
											<Button>Encontrar Serviços</Button>
										</Link>
									</div>
								)}
							</TabsContent>

							<TabsContent value="past" className="mt-6">
								{filterBookingsByStatus("past").length > 0 ? (
									<div className="space-y-4">
										{filterBookingsByStatus("past").map((booking) => (
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
													{renderBookingActions(booking)}
												</div>
											</div>
										))}
									</div>
								) : (
									<div className="py-12 text-center">
										<Star className="mx-auto mb-4 h-12 w-12 text-gray-400" />
										<h3 className="mb-2 font-semibold text-gray-900 text-lg">
											Nenhum serviço concluído
										</h3>
										<p className="text-gray-600">
											Você ainda não possui agendamentos concluídos.
										</p>
									</div>
								)}
							</TabsContent>

							<TabsContent value="cancelled" className="mt-6">
								{filterBookingsByStatus("cancelled").length > 0 ? (
									<div className="space-y-4">
										{filterBookingsByStatus("cancelled").map((booking) => (
											<div
												key={booking.id}
												className="flex items-center justify-between rounded-lg border p-4 opacity-75"
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
													{renderBookingActions(booking)}
												</div>
											</div>
										))}
									</div>
								) : (
									<div className="py-12 text-center">
										<Calendar className="mx-auto mb-4 h-12 w-12 text-gray-400" />
										<h3 className="mb-2 font-semibold text-gray-900 text-lg">
											Nenhum agendamento cancelado
										</h3>
										<p className="text-gray-600">
											Todos os seus agendamentos estão ativos.
										</p>
									</div>
								)}
							</TabsContent>
						</Tabs>
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

			{/* Review Modal */}
			{selectedBooking && (
				<ReviewModal
					isOpen={reviewModalOpen}
					onClose={() => {
						setReviewModalOpen(false);
						setSelectedBooking(null);
					}}
					serviceId={selectedBooking.serviceId}
					bookingId={selectedBooking.id}
					serviceName={selectedBooking.serviceName}
				/>
			)}
		</div>
	);
}
