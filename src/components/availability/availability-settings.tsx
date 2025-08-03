"use client";

import { Clock, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import { Label } from "~/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "~/components/ui/select";
import { Skeleton } from "~/components/ui/skeleton";
import { Switch } from "~/components/ui/switch";
import { useToast } from "~/hooks/use-toast";
import { api } from "~/trpc/react";

const DAYS_OF_WEEK = [
	{ value: 0, label: "Domingo" },
	{ value: 1, label: "Segunda-feira" },
	{ value: 2, label: "Terça-feira" },
	{ value: 3, label: "Quarta-feira" },
	{ value: 4, label: "Quinta-feira" },
	{ value: 5, label: "Sexta-feira" },
	{ value: 6, label: "Sábado" },
];

const TIME_OPTIONS = Array.from({ length: 17 }, (_, i) => {
	const hour = i + 6; // 6 AM to 10 PM
	return {
		value: `${hour.toString().padStart(2, "0")}:00`,
		label: `${hour.toString().padStart(2, "0")}:00`,
	};
});

// Add half-hour options
const ALL_TIME_OPTIONS = TIME_OPTIONS.flatMap((time) => {
	const parts = time.value.split(":");
	if (!parts[0]) return [time];
	const hour = Number.parseInt(parts[0]);
	return [
		time,
		{
			value: `${hour.toString().padStart(2, "0")}:30`,
			label: `${hour.toString().padStart(2, "0")}:30`,
		},
	];
}).sort((a, b) => a.value.localeCompare(b.value));

interface NewAvailability {
	dayOfWeek: number;
	startTime: string;
	endTime: string;
	isActive: boolean;
}

export function AvailabilitySettings() {
	const { toast } = useToast();
	const [newAvailability, setNewAvailability] = useState<NewAvailability>({
		dayOfWeek: 1,
		startTime: "09:00",
		endTime: "18:00",
		isActive: true,
	});

	// Get current availability
	const {
		data: availability,
		isLoading,
		refetch,
	} = api.availability.getMyAvailability.useQuery();

	// Set availability mutation
	const setAvailability = api.availability.setAvailability.useMutation({
		onSuccess: () => {
			toast({
				title: "Disponibilidade atualizada",
				description: "Sua disponibilidade foi atualizada com sucesso.",
			});
			refetch();
			// Reset form
			setNewAvailability({
				dayOfWeek: 1,
				startTime: "09:00",
				endTime: "18:00",
				isActive: true,
			});
		},
		onError: (error) => {
			toast({
				title: "Erro ao atualizar disponibilidade",
				description: error.message,
				variant: "destructive",
			});
		},
	});

	// Remove availability mutation
	const removeAvailability = api.availability.removeAvailability.useMutation({
		onSuccess: () => {
			toast({
				title: "Disponibilidade removida",
				description: "O horário foi removido com sucesso.",
			});
			refetch();
		},
		onError: (error) => {
			toast({
				title: "Erro ao remover disponibilidade",
				description: error.message,
				variant: "destructive",
			});
		},
	});

	const handleAddAvailability = () => {
		if (newAvailability.startTime >= newAvailability.endTime) {
			toast({
				title: "Horário inválido",
				description: "O horário de término deve ser após o horário de início.",
				variant: "destructive",
			});
			return;
		}

		setAvailability.mutate(newAvailability);
	};

	const handleToggleAvailability = (
		availabilityId: string,
		isActive: boolean,
	) => {
		// Find the availability to update
		const availabilityToUpdate = Object.values(availability || {})
			.flat()
			.find((a) => a.id === availabilityId);

		if (availabilityToUpdate) {
			setAvailability.mutate({
				dayOfWeek: availabilityToUpdate.dayOfWeek,
				startTime: availabilityToUpdate.startTime,
				endTime: availabilityToUpdate.endTime,
				isActive,
			});
		}
	};

	if (isLoading) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Configurações de Disponibilidade</CardTitle>
					<CardDescription>
						Configure seus horários de atendimento semanais
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="space-y-4">
						{[1, 2, 3].map((i) => (
							<Skeleton key={i} className="h-16 w-full" />
						))}
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Clock className="h-5 w-5" />
					Configurações de Disponibilidade
				</CardTitle>
				<CardDescription>
					Configure seus horários de atendimento semanais
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-6">
				{/* Add new availability */}
				<div className="rounded-lg border p-4">
					<h3 className="mb-4 font-medium">Adicionar Novo Horário</h3>
					<div className="grid gap-4 md:grid-cols-4">
						<div>
							<Label htmlFor="dayOfWeek">Dia da Semana</Label>
							<Select
								value={newAvailability.dayOfWeek.toString()}
								onValueChange={(value) =>
									setNewAvailability({
										...newAvailability,
										dayOfWeek: Number.parseInt(value),
									})
								}
							>
								<SelectTrigger id="dayOfWeek">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{DAYS_OF_WEEK.map((day) => (
										<SelectItem key={day.value} value={day.value.toString()}>
											{day.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div>
							<Label htmlFor="startTime">Início</Label>
							<Select
								value={newAvailability.startTime}
								onValueChange={(value) =>
									setNewAvailability({ ...newAvailability, startTime: value })
								}
							>
								<SelectTrigger id="startTime">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{ALL_TIME_OPTIONS.map((time) => (
										<SelectItem key={time.value} value={time.value}>
											{time.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div>
							<Label htmlFor="endTime">Término</Label>
							<Select
								value={newAvailability.endTime}
								onValueChange={(value) =>
									setNewAvailability({ ...newAvailability, endTime: value })
								}
							>
								<SelectTrigger id="endTime">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{ALL_TIME_OPTIONS.map((time) => (
										<SelectItem key={time.value} value={time.value}>
											{time.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className="flex items-end">
							<Button
								onClick={handleAddAvailability}
								disabled={setAvailability.isPending}
								className="w-full"
							>
								<Plus className="mr-2 h-4 w-4" />
								Adicionar
							</Button>
						</div>
					</div>
				</div>

				{/* Current availability */}
				<div className="space-y-4">
					<h3 className="font-medium">Horários Configurados</h3>
					{Object.entries(availability || {}).length === 0 ? (
						<p className="text-center text-muted-foreground text-sm">
							Nenhum horário configurado. Adicione seus horários de atendimento
							acima.
						</p>
					) : (
						<div className="space-y-2">
							{DAYS_OF_WEEK.map((day) => {
								const dayAvailabilities = availability?.[day.value] || [];
								if (dayAvailabilities.length === 0) return null;

								return (
									<div key={day.value} className="space-y-2">
										<h4 className="font-medium text-muted-foreground text-sm">
											{day.label}
										</h4>
										{dayAvailabilities.map((avail) => (
											<div
												key={avail.id}
												className="flex items-center justify-between rounded-lg border p-3"
											>
												<div className="flex items-center gap-4">
													<Switch
														checked={avail.isActive}
														onCheckedChange={(checked) =>
															handleToggleAvailability(avail.id, checked)
														}
													/>
													<span
														className={
															avail.isActive ? "" : "text-muted-foreground"
														}
													>
														{avail.startTime} - {avail.endTime}
													</span>
												</div>
												<Button
													variant="ghost"
													size="sm"
													onClick={() =>
														removeAvailability.mutate({
															availabilityId: avail.id,
														})
													}
													disabled={removeAvailability.isPending}
												>
													<Trash2 className="h-4 w-4" />
												</Button>
											</div>
										))}
									</div>
								);
							})}
						</div>
					)}
				</div>
			</CardContent>
		</Card>
	);
}
