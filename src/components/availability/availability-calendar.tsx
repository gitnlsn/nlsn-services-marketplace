"use client";

import moment from "moment";
import { useState } from "react";
import { Calendar, type View, momentLocalizer } from "react-big-calendar";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarIcon, Clock, X } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "~/components/ui/dialog";
import { Skeleton } from "~/components/ui/skeleton";
import { useToast } from "~/hooks/use-toast";
import { api } from "~/trpc/react";

// Configure moment for Brazilian Portuguese
moment.locale("pt-br");
const localizer = momentLocalizer(moment);

interface CalendarEvent {
	id: string;
	title: string;
	start: Date;
	end: Date;
	resource: {
		type: "availability" | "booking";
		isBooked?: boolean;
		booking?: {
			id: string;
			clientName: string;
			status: string;
			client?: {
				name?: string;
				email?: string;
				phone?: string;
			};
		};
	};
}

interface AvailabilityCalendarProps {
	providerId?: string;
	serviceId?: string;
	isEditable?: boolean;
}

export function AvailabilityCalendar({
	providerId,
	serviceId,
	isEditable = false,
}: AvailabilityCalendarProps) {
	const { toast } = useToast();
	const [view, setView] = useState<View>("week");
	const [date, setDate] = useState(new Date());
	const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(
		null,
	);

	// Get weekly schedule
	const {
		data: schedule,
		isLoading,
		refetch,
	} = api.availability.getWeeklySchedule.useQuery({
		providerId,
		weekStart: moment(date).startOf("week").toDate(),
	});

	// Transform schedule data to calendar events
	const events: CalendarEvent[] = [];
	if (schedule) {
		for (const [dateStr, slots] of Object.entries(schedule)) {
			for (const slot of slots) {
				events.push({
					id: slot.id,
					title: slot.isBooked
						? slot.booking?.service?.title || "Reservado"
						: "Disponível",
					start: new Date(slot.startTime),
					end: new Date(slot.endTime),
					resource: {
						type: slot.isBooked ? "booking" : "availability",
						isBooked: slot.isBooked,
						booking: slot.booking
							? {
									id: slot.booking.id,
									clientName: slot.booking.client?.name || "Cliente",
									status: slot.booking.status,
								}
							: undefined,
					},
				});
			}
		}
	}

	// Release time slot mutation
	const releaseTimeSlot = api.availability.releaseTimeSlot.useMutation({
		onSuccess: () => {
			toast({
				title: "Horário liberado",
				description: "O horário foi liberado com sucesso.",
			});
			refetch();
			setSelectedEvent(null);
		},
		onError: (error) => {
			toast({
				title: "Erro ao liberar horário",
				description: error.message,
				variant: "destructive",
			});
		},
	});

	const handleSelectEvent = (event: CalendarEvent) => {
		if (isEditable) {
			setSelectedEvent(event);
		}
	};

	const handleReleaseSlot = () => {
		if (selectedEvent && !selectedEvent.resource.isBooked) {
			releaseTimeSlot.mutate({ timeSlotId: selectedEvent.id });
		}
	};

	const eventStyleGetter = (event: CalendarEvent) => {
		const isBooked = event.resource.isBooked;
		return {
			style: {
				backgroundColor: isBooked ? "#ef4444" : "#22c55e",
				borderRadius: "4px",
				opacity: 0.9,
				color: "white",
				border: "0px",
				display: "block",
			},
		};
	};

	const messages = {
		allDay: "Dia todo",
		previous: "Anterior",
		next: "Próximo",
		today: "Hoje",
		month: "Mês",
		week: "Semana",
		day: "Dia",
		agenda: "Agenda",
		date: "Data",
		time: "Hora",
		event: "Evento",
		noEventsInRange: "Não há eventos neste período.",
		showMore: (total: number) => `+${total} mais`,
	};

	const formats = {
		dayFormat: "DD/MM",
		monthHeaderFormat: "MMMM YYYY",
		dayHeaderFormat: "dddd, DD/MM",
		agendaDateFormat: "DD/MM",
		agendaHeaderFormat: ({ start, end }: { start: Date; end: Date }) =>
			`${format(start, "dd/MM", { locale: ptBR })} - ${format(end, "dd/MM", { locale: ptBR })}`,
	};

	if (isLoading) {
		return (
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<CalendarIcon className="h-5 w-5" />
						Calendário de Disponibilidade
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="h-[600px]">
						<Skeleton className="h-full w-full" />
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<>
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<CalendarIcon className="h-5 w-5" />
						Calendário de Disponibilidade
					</CardTitle>
					<div className="mt-2 flex gap-4">
						<div className="flex items-center gap-2">
							<div className="h-4 w-4 rounded bg-green-500" />
							<span className="text-sm">Disponível</span>
						</div>
						<div className="flex items-center gap-2">
							<div className="h-4 w-4 rounded bg-red-500" />
							<span className="text-sm">Reservado</span>
						</div>
					</div>
				</CardHeader>
				<CardContent>
					<div className="h-[600px]">
						<Calendar
							localizer={localizer}
							events={events}
							startAccessor="start"
							endAccessor="end"
							view={view}
							onView={setView}
							date={date}
							onNavigate={setDate}
							onSelectEvent={handleSelectEvent}
							eventPropGetter={eventStyleGetter}
							messages={messages}
							formats={formats}
							culture="pt-BR"
							min={new Date(0, 0, 0, 6, 0, 0)}
							max={new Date(0, 0, 0, 22, 0, 0)}
						/>
					</div>
				</CardContent>
			</Card>

			<Dialog
				open={!!selectedEvent}
				onOpenChange={() => setSelectedEvent(null)}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>
							{selectedEvent?.resource.isBooked
								? "Detalhes da Reserva"
								: "Horário Disponível"}
						</DialogTitle>
						<DialogDescription>
							{selectedEvent && (
								<div className="mt-4 space-y-3">
									<div className="flex items-center gap-2">
										<Clock className="h-4 w-4 text-muted-foreground" />
										<span>
											{format(selectedEvent.start, "dd/MM/yyyy HH:mm")} -{" "}
											{format(selectedEvent.end, "HH:mm")}
										</span>
									</div>

									{selectedEvent.resource.isBooked &&
										selectedEvent.resource.booking && (
											<>
												<div className="space-y-2">
													<p className="font-medium">
														Cliente:{" "}
														{selectedEvent.resource.booking.client?.name}
													</p>
													<p className="text-muted-foreground text-sm">
														{selectedEvent.resource.booking.client?.email}
													</p>
													{selectedEvent.resource.booking.client?.phone && (
														<p className="text-muted-foreground text-sm">
															{selectedEvent.resource.booking.client.phone}
														</p>
													)}
												</div>
												<div className="pt-2">
													<Badge
														variant={
															selectedEvent.resource.booking.status ===
															"accepted"
																? "default"
																: "secondary"
														}
													>
														{selectedEvent.resource.booking.status}
													</Badge>
												</div>
											</>
										)}

									{isEditable && !selectedEvent.resource.isBooked && (
										<div className="pt-4">
											<Button
												variant="destructive"
												onClick={handleReleaseSlot}
												disabled={releaseTimeSlot.isPending}
												className="w-full"
											>
												<X className="mr-2 h-4 w-4" />
												Remover Disponibilidade
											</Button>
										</div>
									)}
								</div>
							)}
						</DialogDescription>
					</DialogHeader>
				</DialogContent>
			</Dialog>
		</>
	);
}
