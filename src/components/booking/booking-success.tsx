"use client";

import {
	CalendarIcon,
	CheckCircleIcon,
	ClockIcon,
	EnvelopeIcon,
	MapPinIcon,
	PhoneIcon,
	ShareIcon,
} from "@heroicons/react/24/outline";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar, Clock, Download, Mail, MessageCircle } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";

interface BookingDetails {
	id: string;
	referenceNumber: string;
	service: {
		id: string;
		title: string;
		price: number;
		priceType: "fixed" | "hourly";
		duration?: number;
		location?: string;
		provider: {
			id: string;
			name: string;
			image?: string;
			phone?: string;
			email?: string;
		};
	};
	bookingDate: Date;
	endDate?: Date;
	totalPrice: number;
	status: "pending" | "confirmed" | "completed" | "cancelled";
	address?: string;
	notes?: string;
	paymentMethod?: string;
	createdAt: Date;
}

interface BookingSuccessProps {
	booking: BookingDetails;
	className?: string;
}

export function BookingSuccess({
	booking,
	className = "",
}: BookingSuccessProps) {
	const [isAnimating, setIsAnimating] = useState(true);

	// Stop animation after 3 seconds
	setTimeout(() => setIsAnimating(false), 3000);

	const formatPrice = (price: number) => {
		return new Intl.NumberFormat("pt-BR", {
			style: "currency",
			currency: "BRL",
		}).format(price);
	};

	const generateCalendarEventUrl = (type: "google" | "outlook" | "apple") => {
		const startDate = `${booking.bookingDate.toISOString().replace(/[-:]/g, "").split(".")[0]}Z`;
		const endDate = `${
			(
				booking.endDate ||
				new Date(
					booking.bookingDate.getTime() +
						(booking.service.duration || 60) * 60000,
				)
			)
				.toISOString()
				.replace(/[-:]/g, "")
				.split(".")[0]
		}Z`;

		const title = encodeURIComponent(
			`${booking.service.title} - ${booking.service.provider.name}`,
		);
		const details = encodeURIComponent(
			`Serviço: ${booking.service.title}\nProfissional: ${booking.service.provider.name}\nEndereço: ${booking.address || booking.service.location || "A definir"}\nReferência: ${booking.referenceNumber}\n\nDetalhes: ${booking.notes || "Nenhuma observação"}`,
		);
		const location = encodeURIComponent(
			booking.address || booking.service.location || "",
		);

		switch (type) {
			case "google":
				return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startDate}/${endDate}&details=${details}&location=${location}`;
			case "outlook":
				return `https://outlook.live.com/calendar/0/deeplink/compose?subject=${title}&startdt=${startDate}&enddt=${endDate}&body=${details}&location=${location}`;
			case "apple":
				return `data:text/calendar;charset=utf8,BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
URL:${window.location.href}
DTSTART:${startDate}
DTEND:${endDate}
SUMMARY:${decodeURIComponent(title)}
DESCRIPTION:${decodeURIComponent(details)}
LOCATION:${decodeURIComponent(location)}
END:VEVENT
END:VCALENDAR`;
			default:
				return "";
		}
	};

	const downloadICS = () => {
		const icsContent = generateCalendarEventUrl("apple");
		const blob = new Blob([icsContent], {
			type: "text/calendar;charset=utf-8",
		});
		const link = document.createElement("a");
		link.href = URL.createObjectURL(blob);
		link.download = `agendamento-${booking.referenceNumber}.ics`;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	};

	const shareBooking = async () => {
		const shareData = {
			title: `Agendamento confirmado - ${booking.service.title}`,
			text: `Agendei ${booking.service.title} com ${booking.service.provider.name} para ${format(booking.bookingDate, "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}`,
			url: window.location.href,
		};

		if (navigator.share) {
			try {
				await navigator.share(shareData);
			} catch (err) {
				console.log("Error sharing:", err);
			}
		} else {
			// Fallback: copy to clipboard
			navigator.clipboard.writeText(`${shareData.text} - ${shareData.url}`);
			alert("Link copiado para a área de transferência!");
		}
	};

	return (
		<div
			className={`min-h-screen bg-gradient-to-br from-green-50 to-indigo-50 py-8 ${className}`}
		>
			<div className="container mx-auto px-4">
				<div className="mx-auto max-w-2xl">
					{/* Success Animation */}
					<div className="mb-8 text-center">
						<div
							className={`mx-auto mb-4 h-24 w-24 ${isAnimating ? "animate-bounce" : ""}`}
						>
							<CheckCircleIcon className="h-full w-full text-green-500" />
						</div>
						<h1 className="mb-2 font-bold text-3xl text-gray-900">
							Agendamento Confirmado!
						</h1>
						<p className="text-gray-600 text-lg">
							Seu serviço foi agendado com sucesso. Você receberá uma
							confirmação por email.
						</p>
					</div>

					{/* Booking Reference */}
					<Card className="mb-6 border-green-200 bg-green-50">
						<CardContent className="pt-6">
							<div className="text-center">
								<p className="mb-2 font-medium text-gray-700">
									Número de Referência
								</p>
								<p className="font-bold font-mono text-2xl text-green-700">
									{booking.referenceNumber}
								</p>
								<p className="mt-2 text-gray-600 text-sm">
									Guarde este número para futuras consultas
								</p>
							</div>
						</CardContent>
					</Card>

					{/* Booking Details */}
					<Card className="mb-6">
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<CalendarIcon className="h-5 w-5" />
								Detalhes do Agendamento
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							{/* Service Info */}
							<div className="rounded-lg border p-4">
								<h3 className="mb-3 font-semibold text-gray-900 text-lg">
									{booking.service.title}
								</h3>

								<div className="grid gap-3 md:grid-cols-2">
									<div className="flex items-center gap-2 text-gray-600">
										<CalendarIcon className="h-4 w-4" />
										<span>
											{format(
												booking.bookingDate,
												"EEEE, dd 'de' MMMM 'de' yyyy",
												{ locale: ptBR },
											)}
										</span>
									</div>

									<div className="flex items-center gap-2 text-gray-600">
										<ClockIcon className="h-4 w-4" />
										<span>
											{format(booking.bookingDate, "HH:mm", { locale: ptBR })}
											{booking.endDate && (
												<>
													{" "}
													às{" "}
													{format(booking.endDate, "HH:mm", { locale: ptBR })}
												</>
											)}
										</span>
									</div>

									{(booking.address || booking.service.location) && (
										<div className="flex items-center gap-2 text-gray-600 md:col-span-2">
											<MapPinIcon className="h-4 w-4" />
											<span>{booking.address || booking.service.location}</span>
										</div>
									)}
								</div>

								{booking.service.duration && (
									<div className="mt-3 flex items-center gap-2 text-gray-600">
										<Clock className="h-4 w-4" />
										<span>
											Duração estimada: {booking.service.duration} minutos
										</span>
									</div>
								)}

								{booking.notes && (
									<div className="mt-3">
										<p className="mb-1 font-medium text-gray-700 text-sm">
											Observações:
										</p>
										<p className="text-gray-600 text-sm">{booking.notes}</p>
									</div>
								)}
							</div>

							{/* Provider Info */}
							<div className="rounded-lg border p-4">
								<h4 className="mb-3 font-medium text-gray-900">Profissional</h4>
								<div className="flex items-center gap-4">
									<div className="relative h-12 w-12 overflow-hidden rounded-full">
										<Image
											src={
												booking.service.provider.image ||
												"/placeholder-avatar.jpg"
											}
											alt={booking.service.provider.name}
											fill
											className="object-cover"
										/>
									</div>
									<div className="flex-1">
										<p className="font-medium text-gray-900">
											{booking.service.provider.name}
										</p>
										<div className="mt-1 flex gap-4">
											{booking.service.provider.phone && (
												<Link
													href={`tel:${booking.service.provider.phone}`}
													className="flex items-center gap-1 text-indigo-600 text-sm hover:text-indigo-700"
												>
													<PhoneIcon className="h-4 w-4" />
													Ligar
												</Link>
											)}
											{booking.service.provider.email && (
												<Link
													href={`mailto:${booking.service.provider.email}`}
													className="flex items-center gap-1 text-indigo-600 text-sm hover:text-indigo-700"
												>
													<EnvelopeIcon className="h-4 w-4" />
													Email
												</Link>
											)}
											<Link
												href={`/messages?participant=${booking.service.provider.id}`}
												className="flex items-center gap-1 text-indigo-600 text-sm hover:text-indigo-700"
											>
												<MessageCircle className="h-4 w-4" />
												Mensagem
											</Link>
										</div>
									</div>
								</div>
							</div>

							{/* Price Summary */}
							<div className="rounded-lg bg-gray-50 p-4">
								<div className="flex items-center justify-between">
									<span className="font-medium text-gray-900">Total Pago:</span>
									<span className="font-bold text-2xl text-green-600">
										{formatPrice(booking.totalPrice)}
									</span>
								</div>
								{booking.paymentMethod && (
									<p className="mt-1 text-gray-600 text-sm">
										Método de pagamento: {booking.paymentMethod}
									</p>
								)}
							</div>
						</CardContent>
					</Card>

					{/* Calendar Integration */}
					<Card className="mb-6">
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Calendar className="h-5 w-5" />
								Adicionar ao Calendário
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="grid gap-3 sm:grid-cols-2">
								<Button
									variant="outline"
									onClick={() =>
										window.open(generateCalendarEventUrl("google"), "_blank")
									}
									className="flex items-center gap-2"
								>
									<Calendar className="h-4 w-4" />
									Google Calendar
								</Button>
								<Button
									variant="outline"
									onClick={() =>
										window.open(generateCalendarEventUrl("outlook"), "_blank")
									}
									className="flex items-center gap-2"
								>
									<Calendar className="h-4 w-4" />
									Outlook
								</Button>
								<Button
									variant="outline"
									onClick={downloadICS}
									className="flex items-center gap-2"
								>
									<Download className="h-4 w-4" />
									Baixar .ics
								</Button>
								<Button
									variant="outline"
									onClick={shareBooking}
									className="flex items-center gap-2"
								>
									<ShareIcon className="h-4 w-4" />
									Compartilhar
								</Button>
							</div>
						</CardContent>
					</Card>

					{/* Email Confirmation Notice */}
					<Card className="mb-6 border-blue-200 bg-blue-50">
						<CardContent className="pt-6">
							<div className="flex items-start gap-3">
								<Mail className="mt-0.5 h-5 w-5 text-blue-600" />
								<div>
									<h4 className="font-medium text-blue-900">
										Confirmação por Email
									</h4>
									<p className="mt-1 text-blue-700 text-sm">
										Você receberá um email de confirmação com todos os detalhes
										do agendamento e instruções para o dia do serviço.
									</p>
								</div>
							</div>
						</CardContent>
					</Card>

					{/* Action Buttons */}
					<div className="flex flex-col gap-3 sm:flex-row">
						<Button asChild className="flex-1">
							<Link href="/dashboard">Ver Meus Agendamentos</Link>
						</Button>
						<Button variant="outline" asChild className="flex-1">
							<Link href="/services">Agendar Outro Serviço</Link>
						</Button>
					</div>

					{/* Status Footer */}
					<div className="mt-8 text-center text-gray-500 text-sm">
						<p>
							Status:{" "}
							<span className="font-medium text-green-600">
								Aguardando confirmação
							</span>
						</p>
						<p className="mt-1">
							Criado em{" "}
							{format(booking.createdAt, "dd/MM/yyyy 'às' HH:mm", {
								locale: ptBR,
							})}
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}
