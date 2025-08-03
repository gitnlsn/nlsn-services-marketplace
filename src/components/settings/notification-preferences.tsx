"use client";

import { Bell, Mail, MessageSquare, Phone, Save } from "lucide-react";
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
import { Switch } from "~/components/ui/switch";
import { api } from "~/trpc/react";

interface NotificationChannel {
	id: string;
	label: string;
	description: string;
	icon: React.ElementType;
	enabled: boolean;
}

interface NotificationType {
	id: string;
	label: string;
	description: string;
	enabled: boolean;
}

export function NotificationPreferences() {
	const { data: user, isLoading } = api.user.getCurrentUser.useQuery();
	const utils = api.useUtils();

	const [channels, setChannels] = useState<NotificationChannel[]>([
		{
			id: "email",
			label: "Email",
			description: "Receba notificações por email",
			icon: Mail,
			enabled: user?.notificationEmail ?? true,
		},
		{
			id: "sms",
			label: "SMS",
			description: "Receba mensagens de texto no seu celular",
			icon: Phone,
			enabled: user?.notificationSms ?? false,
		},
		{
			id: "whatsapp",
			label: "WhatsApp",
			description: "Receba mensagens pelo WhatsApp",
			icon: MessageSquare,
			enabled: user?.notificationWhatsapp ?? false,
		},
	]);

	const [types, setTypes] = useState<NotificationType[]>([
		{
			id: "bookings",
			label: "Agendamentos",
			description: "Novos agendamentos, confirmações e cancelamentos",
			enabled: true,
		},
		{
			id: "messages",
			label: "Mensagens",
			description: "Novas mensagens de clientes ou profissionais",
			enabled: true,
		},
		{
			id: "reviews",
			label: "Avaliações",
			description: "Quando alguém avaliar seus serviços",
			enabled: true,
		},
		{
			id: "payments",
			label: "Pagamentos",
			description: "Confirmações de pagamento e saques",
			enabled: true,
		},
		{
			id: "marketing",
			label: "Promoções e Novidades",
			description: "Ofertas especiais e atualizações da plataforma",
			enabled: false,
		},
	]);

	const updatePreferences = api.user.updateNotificationPreferences.useMutation({
		onSuccess: () => {
			utils.user.getCurrentUser.invalidate();
			alert("Preferências salvas com sucesso!");
		},
		onError: (error) => {
			alert(`Erro ao salvar preferências: ${error.message}`);
		},
	});

	const handleChannelToggle = (channelId: string) => {
		setChannels((prev) =>
			prev.map((channel) =>
				channel.id === channelId
					? { ...channel, enabled: !channel.enabled }
					: channel,
			),
		);
	};

	const handleTypeToggle = (typeId: string) => {
		setTypes((prev) =>
			prev.map((type) =>
				type.id === typeId ? { ...type, enabled: !type.enabled } : type,
			),
		);
	};

	const handleSave = () => {
		const emailChannel = channels.find((c) => c.id === "email");
		const smsChannel = channels.find((c) => c.id === "sms");
		const whatsappChannel = channels.find((c) => c.id === "whatsapp");

		updatePreferences.mutate({
			notificationEmail: emailChannel?.enabled,
			notificationSms: smsChannel?.enabled,
			notificationWhatsapp: whatsappChannel?.enabled,
		});
	};

	if (isLoading) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Preferências de Notificação</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="animate-pulse space-y-4">
						<div className="h-20 rounded bg-gray-200" />
						<div className="h-20 rounded bg-gray-200" />
						<div className="h-20 rounded bg-gray-200" />
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle>Preferências de Notificação</CardTitle>
				<CardDescription>
					Escolha como você deseja receber notificações sobre suas atividades
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-6">
				{/* Notification Channels */}
				<div>
					<h3 className="mb-4 font-semibold text-lg">Canais de Notificação</h3>
					<div className="space-y-4">
						{channels.map((channel) => {
							const Icon = channel.icon;
							return (
								<div
									key={channel.id}
									className="flex items-center justify-between rounded-lg border p-4"
								>
									<div className="flex items-center space-x-4">
										<div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
											<Icon className="h-5 w-5 text-gray-600" />
										</div>
										<div>
											<Label
												htmlFor={channel.id}
												className="font-medium text-base"
											>
												{channel.label}
											</Label>
											<p className="text-gray-600 text-sm">
												{channel.description}
											</p>
										</div>
									</div>
									<Switch
										id={channel.id}
										checked={channel.enabled}
										onCheckedChange={() => handleChannelToggle(channel.id)}
									/>
								</div>
							);
						})}
					</div>
				</div>

				{/* Notification Types */}
				<div>
					<h3 className="mb-4 font-semibold text-lg">Tipos de Notificação</h3>
					<div className="space-y-4">
						{types.map((type) => (
							<div
								key={type.id}
								className="flex items-center justify-between rounded-lg border p-4"
							>
								<div>
									<Label htmlFor={type.id} className="font-medium text-base">
										{type.label}
									</Label>
									<p className="text-gray-600 text-sm">{type.description}</p>
								</div>
								<Switch
									id={type.id}
									checked={type.enabled}
									onCheckedChange={() => handleTypeToggle(type.id)}
								/>
							</div>
						))}
					</div>
				</div>

				{/* Save Button */}
				<div className="flex justify-end border-t pt-4">
					<Button
						onClick={handleSave}
						disabled={updatePreferences.isPending}
						className="flex items-center space-x-2"
					>
						{updatePreferences.isPending ? (
							<>
								<div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
								<span>Salvando...</span>
							</>
						) : (
							<>
								<Save className="h-4 w-4" />
								<span>Salvar Preferências</span>
							</>
						)}
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}
