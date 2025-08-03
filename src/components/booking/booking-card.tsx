"use client";

import {
	CalendarIcon,
	ClockIcon,
	MapPinIcon,
} from "@heroicons/react/24/outline";
import { CheckIcon, XMarkIcon } from "@heroicons/react/24/solid";
import { useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader } from "~/components/ui/card";
import { DateDisplay } from "~/components/ui/date-display";
import { PriceDisplay } from "~/components/ui/price-display";
import { StatusBadge } from "~/components/ui/status-badge";
import { api } from "~/trpc/react";

interface BookingCardProps {
	booking: {
		id: string;
		bookingDate: string;
		endDate?: string | null;
		status: string;
		totalPrice: number;
		notes?: string | null;
		address?: string | null;
		service: {
			id: string;
			title: string;
			images?: { url: string }[];
			category: { name: string };
		};
		client: {
			id: string;
			name?: string | null;
			image?: string | null;
		};
		provider: {
			id: string;
			name?: string | null;
			image?: string | null;
		};
	};
	role?: "client" | "provider";
}

export function BookingCard({ booking, role: providedRole }: BookingCardProps) {
	const router = useRouter();
	const { data: session } = useSession();
	const utils = api.useUtils();

	// Determine role based on session if not provided
	const role =
		providedRole ||
		(booking.client.id === session?.user?.id ? "client" : "provider");

	const acceptBooking = api.booking.accept.useMutation({
		onSuccess: () => {
			utils.booking.list.invalidate();
			alert("Agendamento aceito com sucesso!");
		},
		onError: (error) => {
			alert(`Erro ao aceitar agendamento: ${error.message}`);
		},
	});

	const declineBooking = api.booking.decline.useMutation({
		onSuccess: () => {
			utils.booking.list.invalidate();
			alert("Agendamento recusado!");
		},
		onError: (error) => {
			alert(`Erro ao recusar agendamento: ${error.message}`);
		},
	});

	const updateBookingStatus = api.booking.updateStatus.useMutation({
		onSuccess: () => {
			utils.booking.list.invalidate();
			alert("Status atualizado com sucesso!");
		},
		onError: (error) => {
			alert(`Erro ao atualizar status: ${error.message}`);
		},
	});

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

	const handleCancel = () => {
		const reason = prompt("Motivo do cancelamento:");
		if (reason) {
			updateBookingStatus.mutate({
				bookingId: booking.id,
				status: "cancelled",
				reason,
			});
		}
	};

	const handleComplete = () => {
		updateBookingStatus.mutate({
			bookingId: booking.id,
			status: "completed",
		});
	};

	const handlePayment = () => {
		router.push(`/bookings/${booking.id}/payment`);
	};

	const formatTime = (date: string) => {
		return new Date(date).toLocaleTimeString("pt-BR", {
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	const otherParty = role === "client" ? booking.provider : booking.client;

	return (
		<Card className="overflow-hidden transition-shadow hover:shadow-lg">
			<CardHeader className="pb-4">
				<div className="flex items-start justify-between">
					<div className="flex-1">
						<div className="flex items-center gap-3">
							<h3 className="font-semibold text-lg">{booking.service.title}</h3>
							<StatusBadge status={booking.status} type="booking" />
						</div>
						<p className="mt-1 text-gray-500 text-sm">
							{booking.service.category.name}
						</p>
					</div>
					<div className="text-right">
						<p className="font-bold text-2xl text-indigo-600">
							<PriceDisplay amount={booking.totalPrice} />
						</p>
					</div>
				</div>
			</CardHeader>

			<CardContent className="space-y-4">
				{/* Date and Time */}
				<div className="flex items-center gap-4 text-sm">
					<div className="flex items-center gap-2">
						<CalendarIcon className="h-4 w-4 text-gray-400" />
						<DateDisplay date={booking.bookingDate} format="full" />
					</div>
					<div className="flex items-center gap-2">
						<ClockIcon className="h-4 w-4 text-gray-400" />
						<span>{formatTime(booking.bookingDate)}</span>
						{booking.endDate && <span>- {formatTime(booking.endDate)}</span>}
					</div>
				</div>

				{/* Location */}
				{booking.address && (
					<div className="flex items-center gap-2 text-sm">
						<MapPinIcon className="h-4 w-4 text-gray-400" />
						<span>{booking.address}</span>
					</div>
				)}

				{/* Other Party Info */}
				<div className="flex items-center gap-3 pt-2">
					<div className="relative h-10 w-10 overflow-hidden rounded-full">
						<Image
							src={otherParty.image || "/placeholder-avatar.jpg"}
							alt={otherParty.name || "User"}
							fill
							className="object-cover"
						/>
					</div>
					<div>
						<p className="font-medium">
							{role === "client" ? "Profissional:" : "Cliente:"}{" "}
							{otherParty.name || "Usuário"}
						</p>
					</div>
				</div>

				{/* Notes */}
				{booking.notes && (
					<div className="rounded-lg bg-gray-50 p-3">
						<p className="text-gray-600 text-sm">
							<span className="font-medium">Observações:</span> {booking.notes}
						</p>
					</div>
				)}

				{/* Actions */}
				<div className="flex gap-2 pt-2">
					{role === "provider" && booking.status === "pending" && (
						<>
							<Button
								size="sm"
								onClick={handleAccept}
								disabled={acceptBooking.isPending}
								className="flex-1"
							>
								<CheckIcon className="mr-1 h-4 w-4" />
								Aceitar
							</Button>
							<Button
								size="sm"
								variant="destructive"
								onClick={handleDecline}
								disabled={declineBooking.isPending}
								className="flex-1"
							>
								<XMarkIcon className="mr-1 h-4 w-4" />
								Recusar
							</Button>
						</>
					)}

					{role === "client" && booking.status === "pending" && (
						<Button size="sm" onClick={handlePayment} className="flex-1">
							Realizar Pagamento
						</Button>
					)}

					{role === "client" && booking.status === "accepted" && (
						<Button
							size="sm"
							variant="destructive"
							onClick={handleCancel}
							disabled={updateBookingStatus.isPending}
							className="flex-1"
						>
							Cancelar Agendamento
						</Button>
					)}

					{role === "provider" && booking.status === "accepted" && (
						<>
							<Button
								size="sm"
								onClick={handleComplete}
								disabled={updateBookingStatus.isPending}
								className="flex-1"
							>
								Marcar como Concluído
							</Button>
							<Button
								size="sm"
								variant="outline"
								onClick={handleCancel}
								disabled={updateBookingStatus.isPending}
							>
								Cancelar
							</Button>
						</>
					)}

					<Link href={`/bookings/${booking.id}`} className="flex-1">
						<Button size="sm" variant="outline" className="w-full">
							Ver Detalhes
						</Button>
					</Link>
				</div>
			</CardContent>
		</Card>
	);
}
