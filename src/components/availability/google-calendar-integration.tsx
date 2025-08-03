"use client";

import { addWeeks, endOfWeek, format, startOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlertCircle, Calendar, CheckCircle, Loader2, X } from "lucide-react";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "~/components/ui/select";
import { useToast } from "~/hooks/use-toast";
import { api } from "~/trpc/react";

export function GoogleCalendarIntegration() {
	const { toast } = useToast();
	const [selectedCalendar, setSelectedCalendar] = useState("primary");
	const [syncWeeks, setSyncWeeks] = useState(4);

	// Check if Google Calendar is connected
	const {
		data: isConnected,
		isLoading: checkingConnection,
		refetch: refetchConnection,
	} = api.googleCalendar.isConnected.useQuery();

	// List calendars
	const { data: calendars, isLoading: loadingCalendars } =
		api.googleCalendar.listCalendars.useQuery(undefined, {
			enabled: !!isConnected,
		});

	// Sync availability mutation
	const syncAvailability = api.googleCalendar.syncAvailability.useMutation({
		onSuccess: (data) => {
			toast({
				title: "Sincronização concluída",
				description: `${data.length} horários disponíveis encontrados.`,
			});
		},
		onError: (error) => {
			toast({
				title: "Erro na sincronização",
				description: error.message,
				variant: "destructive",
			});
		},
	});

	const handleConnect = async () => {
		// Re-authenticate with Google to get calendar permissions
		await signIn("google", {
			callbackUrl: window.location.href,
		});
	};

	const handleSync = () => {
		const now = new Date();
		const startDate = startOfWeek(now, { locale: ptBR });
		const endDate = endOfWeek(addWeeks(now, syncWeeks - 1), { locale: ptBR });

		syncAvailability.mutate({
			calendarId: selectedCalendar,
			startDate,
			endDate,
		});
	};

	if (checkingConnection) {
		return (
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Calendar className="h-5 w-5" />
						Google Calendar
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="flex items-center justify-center py-8">
						<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Calendar className="h-5 w-5" />
					Google Calendar
				</CardTitle>
				<CardDescription>
					Sincronize sua disponibilidade com o Google Calendar
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				{!isConnected ? (
					<>
						<Alert>
							<AlertCircle className="h-4 w-4" />
							<AlertDescription>
								Conecte sua conta do Google para sincronizar sua agenda e
								gerenciar reservas diretamente no Google Calendar.
							</AlertDescription>
						</Alert>
						<Button onClick={handleConnect} className="w-full">
							<Calendar className="mr-2 h-4 w-4" />
							Conectar Google Calendar
						</Button>
					</>
				) : (
					<>
						<Alert className="border-green-200 bg-green-50">
							<CheckCircle className="h-4 w-4 text-green-600" />
							<AlertDescription className="text-green-800">
								Google Calendar conectado com sucesso!
							</AlertDescription>
						</Alert>

						{loadingCalendars ? (
							<div className="flex items-center gap-2 text-muted-foreground text-sm">
								<Loader2 className="h-4 w-4 animate-spin" />
								Carregando calendários...
							</div>
						) : (
							<div className="space-y-4">
								<div>
									<label
										htmlFor="calendar-select"
										className="font-medium text-sm"
									>
										Calendário
									</label>
									<Select
										value={selectedCalendar}
										onValueChange={setSelectedCalendar}
									>
										<SelectTrigger>
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											{calendars?.map((calendar) => (
												<SelectItem
													key={calendar.id}
													value={calendar.id || "primary"}
												>
													{calendar.summary || "Calendário Principal"}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>

								<div>
									<label
										htmlFor="sync-period-select"
										className="font-medium text-sm"
									>
										Período de Sincronização
									</label>
									<Select
										value={syncWeeks.toString()}
										onValueChange={(value) =>
											setSyncWeeks(Number.parseInt(value))
										}
									>
										<SelectTrigger>
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="1">1 semana</SelectItem>
											<SelectItem value="2">2 semanas</SelectItem>
											<SelectItem value="4">4 semanas</SelectItem>
											<SelectItem value="8">8 semanas</SelectItem>
										</SelectContent>
									</Select>
								</div>

								<Button
									onClick={handleSync}
									disabled={syncAvailability.isPending}
									className="w-full"
								>
									{syncAvailability.isPending ? (
										<>
											<Loader2 className="mr-2 h-4 w-4 animate-spin" />
											Sincronizando...
										</>
									) : (
										<>
											<Calendar className="mr-2 h-4 w-4" />
											Sincronizar Disponibilidade
										</>
									)}
								</Button>
							</div>
						)}
					</>
				)}
			</CardContent>
		</Card>
	);
}

// Component to create Google Calendar events for bookings
export function GoogleCalendarBookingButton({
	bookingId,
}: { bookingId: string }) {
	const { toast } = useToast();

	const createEvent = api.googleCalendar.createBookingEvent.useMutation({
		onSuccess: () => {
			toast({
				title: "Evento criado",
				description: "A reserva foi adicionada ao seu Google Calendar.",
			});
		},
		onError: (error) => {
			toast({
				title: "Erro ao criar evento",
				description: error.message,
				variant: "destructive",
			});
		},
	});

	const handleCreateEvent = () => {
		createEvent.mutate({ bookingId });
	};

	return (
		<Button
			variant="outline"
			size="sm"
			onClick={handleCreateEvent}
			disabled={createEvent.isPending}
		>
			{createEvent.isPending ? (
				<Loader2 className="h-4 w-4 animate-spin" />
			) : (
				<Calendar className="h-4 w-4" />
			)}
			<span className="ml-2">Adicionar ao Google Calendar</span>
		</Button>
	);
}
