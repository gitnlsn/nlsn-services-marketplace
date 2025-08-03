"use client";

import { useSession } from "next-auth/react";
import { useState } from "react";
import { NotificationPreferences } from "~/components/settings/notification-preferences";
import { Loading } from "~/components/ui/loading";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";

export default function SettingsPage() {
	const { data: session, status } = useSession();
	const [activeTab, setActiveTab] = useState("notifications");

	if (status === "loading") {
		return (
			<Loading
				className="min-h-screen"
				size="lg"
				text="Carregando configurações..."
			/>
		);
	}

	if (!session) {
		return (
			<div className="container mx-auto px-4 py-8 text-center">
				<h1 className="mb-4 font-bold text-2xl text-gray-900">Acesso negado</h1>
				<p className="text-gray-600">
					Você precisa estar autenticado para acessar esta página.
				</p>
			</div>
		);
	}

	return (
		<div className="container mx-auto max-w-4xl px-4 py-8">
			<h1 className="mb-8 font-bold text-3xl text-gray-900">Configurações</h1>

			<Tabs
				value={activeTab}
				onValueChange={setActiveTab}
				className="space-y-6"
			>
				<TabsList>
					<TabsTrigger value="notifications">Notificações</TabsTrigger>
					<TabsTrigger value="privacy">Privacidade</TabsTrigger>
					<TabsTrigger value="security">Segurança</TabsTrigger>
				</TabsList>

				<TabsContent value="notifications">
					<NotificationPreferences />
				</TabsContent>

				<TabsContent value="privacy">
					<div className="rounded-lg border p-6 text-center text-gray-500">
						<p>Configurações de privacidade em breve</p>
					</div>
				</TabsContent>

				<TabsContent value="security">
					<div className="rounded-lg border p-6 text-center text-gray-500">
						<p>Configurações de segurança em breve</p>
					</div>
				</TabsContent>
			</Tabs>
		</div>
	);
}
