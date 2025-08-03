"use client";

import {
	CalendarIcon,
	ClockIcon,
	MapPinIcon,
	UserIcon,
} from "@heroicons/react/24/outline";
import { StarIcon as StarIconSolid } from "@heroicons/react/24/solid";
import { useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { ReviewForm } from "~/components/review/review-form";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Loading } from "~/components/ui/loading";
import { api } from "~/trpc/react";

export default function BookingDetailPage() {
	const params = useParams();
	const router = useRouter();
	const bookingId = params.id as string;
	const { data: session } = useSession();
	const [showReviewForm, setShowReviewForm] = useState(false);

	const { data: booking, isLoading } = api.booking.getById.useQuery({
		bookingId,
	});

	const { data: canReview } = api.review.canReview.useQuery(
		{ serviceId: booking?.service.id || "" },
		{ enabled: !!booking?.service.id && booking?.status === "completed" },
	);

	const utils = api.useUtils();

	const acceptBooking = api.booking.accept.useMutation({
		onSuccess: () => {
			utils.booking.getById.invalidate({ bookingId });
			alert("Agendamento aceito com sucesso!");
		},
	});

	const declineBooking = api.booking.decline.useMutation({
		onSuccess: () => {
			utils.booking.getById.invalidate({ bookingId });
			alert("Agendamento recusado!");
		},
	});

	const updateStatus = api.booking.updateStatus.useMutation({
		onSuccess: () => {
			utils.booking.getById.invalidate({ bookingId });
			alert("Status atualizado com sucesso!");
		},
	});

	if (isLoading) {
		return (
			<Loading
				className="min-h-screen"
				size="lg"
				text="Carregando detalhes..."
			/>
		);
	}

	if (!booking) {
		return (
			<div className="min-h-screen bg-gray-50 py-8">
				<div className="container mx-auto px-4 text-center">
					<h1 className="mb-4 font-bold text-2xl text-gray-900">
						Agendamento não encontrado
					</h1>
					<Button onClick={() => router.push("/bookings")}>
						Voltar aos agendamentos
					</Button>
				</div>
			</div>
		);
	}

	const getStatusBadge = (status: string) => {
		const statusConfig = {
			pending: { label: "Pendente", variant: "outline" as const },
			accepted: { label: "Aceito", variant: "default" as const },
			declined: { label: "Recusado", variant: "destructive" as const },
			completed: { label: "Concluído", variant: "default" as const },
			cancelled: { label: "Cancelado", variant: "secondary" as const },
		};

		const config = statusConfig[status as keyof typeof statusConfig] || {
			label: status,
			variant: "secondary" as const,
		};

		return <Badge variant={config.variant}>{config.label}</Badge>;
	};

	const formatDate = (date: string) => {
		return new Date(date).toLocaleDateString("pt-BR", {
			weekday: "long",
			year: "numeric",
			month: "long",
			day: "numeric",
		});
	};

	const formatTime = (date: string) => {
		return new Date(date).toLocaleTimeString("pt-BR", {
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	const isProvider = booking.service.provider.id === session?.user?.id;
	const isClient = booking.client.id === session?.user?.id;

	return (
		<main className="min-h-screen bg-gray-50 py-8">
			<div className="container mx-auto px-4">
				<div className="mb-6">
					<Button variant="outline" onClick={() => router.push("/bookings")}>
						← Voltar aos agendamentos
					</Button>
				</div>

				<div className="grid gap-6 lg:grid-cols-3">
					{/* Main Content */}
					<div className="space-y-6 lg:col-span-2">
						{/* Booking Details */}
						<Card>
							<CardHeader>
								<div className="flex items-center justify-between">
									<CardTitle>Detalhes do Agendamento</CardTitle>
									{getStatusBadge(booking.status)}
								</div>
							</CardHeader>
							<CardContent className="space-y-4">
								<div>
									<h3 className="mb-2 font-semibold text-lg">
										{booking.service.title}
									</h3>
									<p className="text-gray-600 text-sm">
										{booking.service.category.name}
									</p>
								</div>

								<div className="grid gap-3">
									<div className="flex items-center gap-2">
										<CalendarIcon className="h-5 w-5 text-gray-400" />
										<span>{formatDate(booking.bookingDate.toISOString())}</span>
									</div>
									<div className="flex items-center gap-2">
										<ClockIcon className="h-5 w-5 text-gray-400" />
										<span>{formatTime(booking.bookingDate.toISOString())}</span>
										{booking.endDate && (
											<span>- {formatTime(booking.endDate.toISOString())}</span>
										)}
									</div>
									{booking.address && (
										<div className="flex items-center gap-2">
											<MapPinIcon className="h-5 w-5 text-gray-400" />
											<span>{booking.address}</span>
										</div>
									)}
								</div>

								{booking.notes && (
									<div className="rounded-lg bg-gray-50 p-4">
										<h4 className="mb-1 font-medium">Observações:</h4>
										<p className="text-gray-600 text-sm">{booking.notes}</p>
									</div>
								)}

								{booking.cancellationReason && (
									<div className="rounded-lg bg-red-50 p-4">
										<h4 className="mb-1 font-medium text-red-900">
											Motivo do cancelamento:
										</h4>
										<p className="text-red-700 text-sm">
											{booking.cancellationReason}
										</p>
									</div>
								)}
							</CardContent>
						</Card>

						{/* Service Info */}
						<Card>
							<CardHeader>
								<CardTitle>Informações do Serviço</CardTitle>
							</CardHeader>
							<CardContent>
								{booking.service.images &&
									booking.service.images.length > 0 && (
										<div className="relative mb-4 h-48 overflow-hidden rounded-lg">
											<Image
												src={booking.service.images[0]?.url || ""}
												alt={booking.service.title}
												fill
												className="object-cover"
											/>
										</div>
									)}
								<p className="text-gray-600">{booking.service.description}</p>
								<div className="mt-4">
									<Link href={`/services/${booking.service.id}`}>
										<Button variant="outline" className="w-full">
											Ver página do serviço
										</Button>
									</Link>
								</div>
							</CardContent>
						</Card>

						{/* Review Form */}
						{booking.status === "completed" &&
							isClient &&
							canReview?.canReview &&
							showReviewForm && (
								<ReviewForm
									serviceId={booking.service.id}
									bookingId={booking.id}
									onSuccess={() => {
										setShowReviewForm(false);
										utils.review.canReview.invalidate({
											serviceId: booking.service.id,
										});
										alert("Avaliação enviada com sucesso!");
									}}
									onCancel={() => setShowReviewForm(false)}
								/>
							)}
					</div>

					{/* Sidebar */}
					<div className="space-y-6">
						{/* Payment Info */}
						<Card>
							<CardHeader>
								<CardTitle>Informações de Pagamento</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="space-y-2">
									<div className="flex justify-between">
										<span className="text-gray-600">Valor do serviço</span>
										<span className="font-semibold">
											R$ {booking.totalPrice.toFixed(2)}
										</span>
									</div>
									{booking.payment && (
										<>
											<div className="flex justify-between">
												<span className="text-gray-600">Status</span>
												<Badge
													variant={
														booking.payment.status === "paid"
															? "default"
															: "outline"
													}
												>
													{booking.payment.status === "paid"
														? "Pago"
														: "Pendente"}
												</Badge>
											</div>
											{booking.payment.paymentMethod && (
												<div className="flex justify-between">
													<span className="text-gray-600">Método</span>
													<span>{booking.payment.paymentMethod}</span>
												</div>
											)}
										</>
									)}
								</div>
								{booking.status === "pending" &&
									booking.payment?.status !== "paid" && (
										<Button
											className="mt-4 w-full"
											onClick={() =>
												router.push(`/bookings/${booking.id}/payment`)
											}
										>
											Realizar Pagamento
										</Button>
									)}
							</CardContent>
						</Card>

						{/* Provider Info */}
						<Card>
							<CardHeader>
								<CardTitle>Profissional</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="flex items-center gap-3">
									<div className="relative h-12 w-12 overflow-hidden rounded-full">
										<Image
											src={
												booking.service.provider.image ||
												"/placeholder-avatar.jpg"
											}
											alt={booking.service.provider.name || "Profissional"}
											fill
											className="object-cover"
										/>
									</div>
									<div>
										<p className="font-medium">
											{booking.service.provider.name}
										</p>
										<p className="text-gray-600 text-sm">
											{booking.service.provider.email}
										</p>
									</div>
								</div>
								{booking.service.provider.phone && (
									<p className="mt-3 text-gray-600 text-sm">
										Tel: {booking.service.provider.phone}
									</p>
								)}
							</CardContent>
						</Card>

						{/* Client Info */}
						<Card>
							<CardHeader>
								<CardTitle>Cliente</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="flex items-center gap-3">
									<div className="relative h-12 w-12 overflow-hidden rounded-full">
										<Image
											src={booking.client.image || "/placeholder-avatar.jpg"}
											alt={booking.client.name || "Cliente"}
											fill
											className="object-cover"
										/>
									</div>
									<div>
										<p className="font-medium">{booking.client.name}</p>
										<p className="text-gray-600 text-sm">
											{booking.client.email}
										</p>
									</div>
								</div>
								{booking.client.phone && (
									<p className="mt-3 text-gray-600 text-sm">
										Tel: {booking.client.phone}
									</p>
								)}
							</CardContent>
						</Card>

						{/* Actions */}
						{booking.status === "pending" && isProvider && (
							<Card>
								<CardHeader>
									<CardTitle>Ações</CardTitle>
								</CardHeader>
								<CardContent className="space-y-2">
									<Button
										className="w-full"
										onClick={() =>
											acceptBooking.mutate({ bookingId: booking.id })
										}
										disabled={acceptBooking.isPending}
									>
										Aceitar Agendamento
									</Button>
									<Button
										variant="destructive"
										className="w-full"
										onClick={() => {
											const reason = prompt("Motivo da recusa (opcional):");
											declineBooking.mutate({
												bookingId: booking.id,
												reason: reason || undefined,
											});
										}}
										disabled={declineBooking.isPending}
									>
										Recusar Agendamento
									</Button>
								</CardContent>
							</Card>
						)}

						{booking.status === "accepted" && (
							<Card>
								<CardHeader>
									<CardTitle>Ações</CardTitle>
								</CardHeader>
								<CardContent className="space-y-2">
									{isProvider && (
										<Button
											className="w-full"
											onClick={() =>
												updateStatus.mutate({
													bookingId: booking.id,
													status: "completed",
												})
											}
											disabled={updateStatus.isPending}
										>
											Marcar como Concluído
										</Button>
									)}
									<Button
										variant="destructive"
										className="w-full"
										onClick={() => {
											const reason = prompt("Motivo do cancelamento:");
											if (reason) {
												updateStatus.mutate({
													bookingId: booking.id,
													status: "cancelled",
													reason,
												});
											}
										}}
										disabled={updateStatus.isPending}
									>
										Cancelar Agendamento
									</Button>
								</CardContent>
							</Card>
						)}

						{/* Review Action */}
						{booking.status === "completed" &&
							isClient &&
							canReview?.canReview &&
							!showReviewForm && (
								<Card>
									<CardHeader>
										<CardTitle>Avaliação</CardTitle>
									</CardHeader>
									<CardContent>
										<p className="mb-4 text-gray-600 text-sm">
											Como foi sua experiência com este serviço?
										</p>
										<Button
											className="w-full"
											onClick={() => setShowReviewForm(true)}
										>
											Avaliar Serviço
										</Button>
									</CardContent>
								</Card>
							)}

						{/* Existing Review */}
						{booking.status === "completed" &&
							isClient &&
							canReview?.reason === "already_reviewed" && (
								<Card>
									<CardHeader>
										<CardTitle>Sua Avaliação</CardTitle>
									</CardHeader>
									<CardContent>
										<div className="mb-2 flex items-center gap-1">
											{[1, 2, 3, 4, 5].map((star) => (
												<StarIconSolid
													key={star}
													className={`h-5 w-5 ${
														star <= (canReview.existingReview?.rating || 0)
															? "text-yellow-400"
															: "text-gray-300"
													}`}
												/>
											))}
										</div>
										{canReview.existingReview?.comment && (
											<p className="text-gray-600 text-sm">
												{canReview.existingReview.comment}
											</p>
										)}
										<p className="mt-2 text-gray-500 text-xs">
											Avaliado em{" "}
											{new Date(
												canReview.existingReview?.createdAt || "",
											).toLocaleDateString("pt-BR")}
										</p>
									</CardContent>
								</Card>
							)}
					</div>
				</div>
			</div>
		</main>
	);
}
