"use client";

import {
	CalendarIcon,
	ClockIcon,
	CurrencyDollarIcon,
	StarIcon,
} from "@heroicons/react/24/outline";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar, Check, Clock, MapPin, Users } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { DatePicker } from "~/components/ui/date-picker";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "~/components/ui/select";
import { MessageButton } from "../messaging/message-button";

interface Service {
	id: string;
	title: string;
	price: number;
	priceType: "fixed" | "hourly";
	duration?: number;
	location?: string;
	provider: {
		name?: string;
		image?: string;
		id: string;
	};
}

interface BookingWidgetProps {
	service: Service;
	rating: number;
	reviewCount: number;
	onBookingClick: () => void;
	className?: string;
}

export function BookingWidget({
	service,
	rating,
	reviewCount,
	onBookingClick,
	className = "",
}: BookingWidgetProps) {
	const [selectedDate, setSelectedDate] = useState<Date | null>(null);
	const [selectedTime, setSelectedTime] = useState<string>("");
	const [selectedDuration, setSelectedDuration] = useState<number>(
		service.duration || 60,
	);
	const [selectedAddOns, setSelectedAddOns] = useState<string[]>([]);

	// Generate available time slots
	const generateTimeSlots = () => {
		const slots = [];
		for (let hour = 8; hour <= 18; hour++) {
			for (let minute = 0; minute < 60; minute += 30) {
				const timeString = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
				slots.push(timeString);
			}
		}
		return slots;
	};

	// Mock add-on services
	const addOns = [
		{ id: "express", name: "Atendimento Express", price: 20 },
		{ id: "materials", name: "Materiais Inclusos", price: 50 },
		{ id: "cleanup", name: "Limpeza Pós-Serviço", price: 30 },
	];

	const calculateTotal = () => {
		let total = service.price;

		if (service.priceType === "hourly") {
			total = service.price * (selectedDuration / 60);
		}

		// Add selected add-ons
		for (const addOnId of selectedAddOns) {
			const addOn = addOns.find((ao) => ao.id === addOnId);
			if (addOn) total += addOn.price;
		}

		return total;
	};

	const toggleAddOn = (addOnId: string) => {
		setSelectedAddOns((prev) =>
			prev.includes(addOnId)
				? prev.filter((id) => id !== addOnId)
				: [...prev, addOnId],
		);
	};

	const formatPrice = (price: number) => {
		return new Intl.NumberFormat("pt-BR", {
			style: "currency",
			currency: "BRL",
		}).format(price);
	};

	return (
		<div className={`space-y-6 ${className}`}>
			{/* Price Card */}
			<Card className="sticky top-4">
				<CardHeader className="pb-4">
					<div className="flex items-center justify-between">
						<div>
							<CardTitle className="font-bold text-2xl text-gray-900">
								{formatPrice(service.price)}
								{service.priceType === "hourly" && (
									<span className="font-normal text-gray-600 text-lg">
										/hora
									</span>
								)}
							</CardTitle>
							<p className="text-gray-600 text-sm">
								{service.priceType === "hourly" ? "Por hora" : "Preço fixo"}
							</p>
						</div>
						<div className="text-right">
							<div className="flex items-center gap-1">
								<StarIcon className="h-4 w-4 text-yellow-400" />
								<span className="font-medium text-sm">{rating.toFixed(1)}</span>
							</div>
							<p className="text-gray-500 text-xs">
								({reviewCount} avaliações)
							</p>
						</div>
					</div>
				</CardHeader>

				<CardContent className="space-y-4">
					{/* Date Selection */}
					<div>
						<label
							htmlFor="date-selection"
							className="mb-2 block font-medium text-gray-700 text-sm"
						>
							Data do serviço
						</label>
						<DatePicker
							date={selectedDate || undefined}
							onDateChange={(date) => setSelectedDate(date || null)}
							placeholder="Selecionar data"
						/>
					</div>

					{/* Time Selection */}
					<div>
						<label
							htmlFor="time-selection"
							className="mb-2 block font-medium text-gray-700 text-sm"
						>
							Horário
						</label>
						<Select value={selectedTime} onValueChange={setSelectedTime}>
							<SelectTrigger id="time-selection">
								<SelectValue placeholder="Selecionar horário" />
							</SelectTrigger>
							<SelectContent>
								{generateTimeSlots().map((time) => (
									<SelectItem key={time} value={time}>
										{time}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					{/* Duration Selection (for hourly services) */}
					{service.priceType === "hourly" && (
						<div>
							<label
								htmlFor="duration-selection"
								className="mb-2 block font-medium text-gray-700 text-sm"
							>
								Duração estimada
							</label>
							<Select
								value={selectedDuration.toString()}
								onValueChange={(value) => setSelectedDuration(Number(value))}
							>
								<SelectTrigger id="duration-selection">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="60">1 hora</SelectItem>
									<SelectItem value="90">1.5 horas</SelectItem>
									<SelectItem value="120">2 horas</SelectItem>
									<SelectItem value="180">3 horas</SelectItem>
									<SelectItem value="240">4 horas</SelectItem>
								</SelectContent>
							</Select>
						</div>
					)}

					{/* Add-ons */}
					<div>
						<p className="mb-2 block font-medium text-gray-700 text-sm">
							Serviços adicionais (opcional)
						</p>
						<div className="space-y-2">
							{addOns.map((addOn) => (
								<label
									key={addOn.id}
									className="flex cursor-pointer items-center justify-between rounded-lg border p-3 hover:bg-gray-50"
								>
									<div className="flex items-center gap-3">
										<input
											type="checkbox"
											checked={selectedAddOns.includes(addOn.id)}
											onChange={() => toggleAddOn(addOn.id)}
											className="rounded border-gray-300"
										/>
										<div>
											<p className="font-medium text-gray-900 text-sm">
												{addOn.name}
											</p>
										</div>
									</div>
									<span className="font-medium text-gray-900 text-sm">
										{formatPrice(addOn.price)}
									</span>
								</label>
							))}
						</div>
					</div>

					{/* Service Details */}
					<div className="space-y-2 border-t pt-4">
						{service.duration && (
							<div className="flex items-center gap-2 text-gray-600 text-sm">
								<ClockIcon className="h-4 w-4" />
								<span>Duração: {service.duration} minutos</span>
							</div>
						)}
						{service.location && (
							<div className="flex items-center gap-2 text-gray-600 text-sm">
								<MapPin className="h-4 w-4" />
								<span>{service.location}</span>
							</div>
						)}
					</div>

					{/* Price Breakdown */}
					<div className="space-y-2 border-t pt-4">
						<div className="flex justify-between text-sm">
							<span>Serviço base</span>
							<span>
								{formatPrice(
									service.priceType === "hourly"
										? service.price * (selectedDuration / 60)
										: service.price,
								)}
							</span>
						</div>
						{selectedAddOns.map((addOnId) => {
							const addOn = addOns.find((ao) => ao.id === addOnId);
							return addOn ? (
								<div key={addOnId} className="flex justify-between text-sm">
									<span>{addOn.name}</span>
									<span>{formatPrice(addOn.price)}</span>
								</div>
							) : null;
						})}
						<div className="border-t pt-2">
							<div className="flex justify-between font-semibold">
								<span>Total</span>
								<span>{formatPrice(calculateTotal())}</span>
							</div>
						</div>
					</div>

					{/* Booking Button */}
					<Button
						onClick={onBookingClick}
						className="w-full bg-indigo-600 py-3 hover:bg-indigo-700"
						size="lg"
						disabled={!selectedDate || !selectedTime}
					>
						<Calendar className="mr-2 h-4 w-4" />
						Agendar Serviço
					</Button>

					{/* Contact Button */}
					<MessageButton
						participantId={service.provider.id}
						participantName={service.provider.name}
						className="w-full"
						variant="outline"
					/>

					{/* Trust Indicators */}
					<div className="space-y-2 pt-2 text-center text-gray-500 text-xs">
						<div className="flex items-center justify-center gap-1">
							<Check className="h-3 w-3 text-green-500" />
							<span>Pagamento seguro</span>
						</div>
						<div className="flex items-center justify-center gap-1">
							<Check className="h-3 w-3 text-green-500" />
							<span>Cancelamento gratuito até 24h antes</span>
						</div>
						<div className="flex items-center justify-center gap-1">
							<Check className="h-3 w-3 text-green-500" />
							<span>Suporte ao cliente 24/7</span>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Provider Info */}
			<Card>
				<CardHeader>
					<CardTitle className="text-lg">Sobre o Profissional</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="flex items-center gap-4">
						<div className="relative h-12 w-12 overflow-hidden rounded-full">
							<Image
								src={service.provider.image || "/placeholder-avatar.jpg"}
								alt={service.provider.name || "Profissional"}
								fill
								className="object-cover"
							/>
						</div>
						<div className="flex-1">
							<h4 className="font-semibold text-gray-900">
								{service.provider.name || "Profissional"}
							</h4>
							<div className="flex items-center gap-1">
								<StarIcon className="h-3 w-3 text-yellow-400" />
								<span className="text-gray-600 text-sm">
									{rating.toFixed(1)} • {reviewCount} avaliações
								</span>
							</div>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
