"use client";

import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar, Clock, Users, Zap } from "lucide-react";
import { useState } from "react";
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
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Skeleton } from "~/components/ui/skeleton";
import { useToast } from "~/hooks/use-toast";
import { api } from "~/trpc/react";

interface WaitlistManagementProps {
	serviceId: string;
}

export function WaitlistManagement({ serviceId }: WaitlistManagementProps) {
	const { toast } = useToast();
	const [selectedEntry, setSelectedEntry] = useState<string | null>(null);
	const [notificationDate, setNotificationDate] = useState("");
	const [notificationTime, setNotificationTime] = useState("");

	const {
		data: waitlist,
		isLoading,
		refetch,
	} = api.waitlist.getServiceWaitlist.useQuery({ serviceId });

	const notifyAvailability = api.waitlist.notifyAvailability.useMutation({
		onSuccess: () => {
			toast({
				title: "Notificação enviada",
				description: "O cliente foi notificado sobre a disponibilidade.",
			});
			setSelectedEntry(null);
			refetch();
		},
		onError: (error) => {
			toast({
				title: "Erro ao notificar",
				description: error.message,
				variant: "destructive",
			});
		},
	});

	const updatePriority = api.waitlist.updatePriority.useMutation({
		onSuccess: () => {
			toast({
				title: "Prioridade atualizada",
				description: "A prioridade do cliente foi atualizada.",
			});
			refetch();
		},
		onError: (error) => {
			toast({
				title: "Erro ao atualizar prioridade",
				description: error.message,
				variant: "destructive",
			});
		},
	});

	const handleNotifyAvailability = () => {
		if (!selectedEntry || !notificationDate || !notificationTime) return;

		const availableDate = new Date(`${notificationDate}T${notificationTime}`);

		notifyAvailability.mutate({
			waitlistId: selectedEntry,
			availableDate,
			availableTime: notificationTime,
		});
	};

	const handlePriorityChange = (waitlistId: string, priority: number) => {
		updatePriority.mutate({ waitlistId, priority });
	};

	if (isLoading) {
		return (
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Users className="h-5 w-5" />
						Lista de Espera
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="space-y-4">
						{[1, 2, 3].map((i) => (
							<Skeleton key={i} className="h-20 w-full" />
						))}
					</div>
				</CardContent>
			</Card>
		);
	}

	if (!waitlist || waitlist.length === 0) {
		return (
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Users className="h-5 w-5" />
						Lista de Espera
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="py-8 text-center text-muted-foreground">
						<Users className="mx-auto mb-4 h-12 w-12 opacity-50" />
						<p>Nenhum cliente na lista de espera</p>
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
						<Users className="h-5 w-5" />
						Lista de Espera ({waitlist.length})
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="space-y-4">
						{waitlist.map((entry) => (
							<div
								key={entry.id}
								className="flex items-center justify-between rounded-lg border p-4"
							>
								<div className="space-y-2">
									<div className="flex items-center gap-2">
										<span className="font-medium">{entry.client.name}</span>
										{entry.priority > 0 && (
											<Badge variant="secondary">
												Prioridade {entry.priority}
											</Badge>
										)}
									</div>
									<div className="flex items-center gap-4 text-muted-foreground text-sm">
										<div className="flex items-center gap-1">
											<Calendar className="h-4 w-4" />
											{format(entry.preferredDate, "dd/MM/yyyy", {
												locale: ptBR,
											})}
										</div>
										{entry.preferredTime && (
											<div className="flex items-center gap-1">
												<Clock className="h-4 w-4" />
												{entry.preferredTime}
											</div>
										)}
									</div>
									{entry.notes && (
										<p className="text-muted-foreground text-sm">
											{entry.notes}
										</p>
									)}
									<div className="text-muted-foreground text-xs">
										Adicionado em{" "}
										{format(entry.createdAt, "dd/MM/yyyy HH:mm", {
											locale: ptBR,
										})}
									</div>
								</div>
								<div className="flex items-center gap-2">
									<div className="flex items-center gap-1">
										<Label htmlFor={`priority-${entry.id}`} className="text-xs">
											Prioridade:
										</Label>
										<select
											id={`priority-${entry.id}`}
											value={entry.priority}
											onChange={(e) =>
												handlePriorityChange(
													entry.id,
													Number.parseInt(e.target.value),
												)
											}
											className="rounded border px-1 py-0.5 text-xs"
										>
											{[0, 1, 2, 3, 4, 5].map((p) => (
												<option key={p} value={p}>
													{p}
												</option>
											))}
										</select>
									</div>
									<Button
										size="sm"
										onClick={() => setSelectedEntry(entry.id)}
										disabled={notifyAvailability.isPending}
									>
										<Zap className="mr-1 h-4 w-4" />
										Notificar
									</Button>
								</div>
							</div>
						))}
					</div>
				</CardContent>
			</Card>

			<Dialog
				open={!!selectedEntry}
				onOpenChange={() => setSelectedEntry(null)}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Notificar Disponibilidade</DialogTitle>
						<DialogDescription>
							Informe a data e horário disponível para notificar o cliente.
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4">
						<div>
							<Label htmlFor="date">Data Disponível</Label>
							<Input
								id="date"
								type="date"
								value={notificationDate}
								onChange={(e) => setNotificationDate(e.target.value)}
							/>
						</div>
						<div>
							<Label htmlFor="time">Horário Disponível</Label>
							<Input
								id="time"
								type="time"
								value={notificationTime}
								onChange={(e) => setNotificationTime(e.target.value)}
							/>
						</div>
						<div className="flex justify-end gap-2">
							<Button variant="outline" onClick={() => setSelectedEntry(null)}>
								Cancelar
							</Button>
							<Button
								onClick={handleNotifyAvailability}
								disabled={
									!notificationDate ||
									!notificationTime ||
									notifyAvailability.isPending
								}
							>
								{notifyAvailability.isPending ? "Enviando..." : "Notificar"}
							</Button>
						</div>
					</div>
				</DialogContent>
			</Dialog>
		</>
	);
}
