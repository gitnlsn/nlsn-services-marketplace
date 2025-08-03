"use client";

import {
	AlertCircle,
	CheckCircle,
	Loader2,
	Mail,
	MessageSquare,
	Phone,
	XCircle,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Switch } from "~/components/ui/switch";
import { api } from "~/trpc/react";

export function CommunicationSettings() {
	const [testingService, setTestingService] = useState<string | null>(null);

	// Get service status
	const { data: serviceStatus, isLoading: statusLoading } =
		api.communication.getServiceStatus.useQuery();

	// Test connection mutations
	const testEmailMutation = api.communication.testConnection.useMutation();
	const testSMSMutation = api.communication.testConnection.useMutation();
	const testWhatsAppMutation = api.communication.testConnection.useMutation();

	const handleTestConnection = async (
		service: "email" | "sms" | "whatsapp",
	) => {
		setTestingService(service);
		try {
			let result: { message: string };
			switch (service) {
				case "email":
					result = await testEmailMutation.mutateAsync({ service: "email" });
					break;
				case "sms":
					result = await testSMSMutation.mutateAsync({ service: "sms" });
					break;
				case "whatsapp":
					result = await testWhatsAppMutation.mutateAsync({
						service: "whatsapp",
					});
					break;
			}

			alert(result.message);
		} catch (error) {
			alert(
				`Erro ao testar ${service}: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
			);
		} finally {
			setTestingService(null);
		}
	};

	const getStatusIcon = (configured: boolean) => {
		if (configured) {
			return <CheckCircle className="h-4 w-4 text-green-500" />;
		}
		return <XCircle className="h-4 w-4 text-red-500" />;
	};

	const getStatusBadge = (configured: boolean, provider: string) => {
		if (configured && provider !== "None") {
			return <Badge className="bg-green-100 text-green-800">{provider}</Badge>;
		}
		return (
			<Badge variant="destructive" className="bg-red-100 text-red-800">
				Não configurado
			</Badge>
		);
	};

	if (statusLoading) {
		return (
			<div className="flex items-center justify-center p-8">
				<Loader2 className="h-8 w-8 animate-spin" />
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div>
				<h2 className="font-bold text-2xl text-gray-900">
					Configurações de Comunicação
				</h2>
				<p className="mt-2 text-gray-600">
					Configure os serviços de notificação por email, SMS e WhatsApp.
				</p>
			</div>

			{/* Service Status Overview */}
			<div className="grid gap-6 md:grid-cols-3">
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="font-medium text-sm">Email</CardTitle>
						<Mail className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="flex items-center justify-between">
							<div className="flex items-center space-x-2">
								{getStatusIcon(serviceStatus?.email.configured || false)}
								<span className="text-sm">
									{serviceStatus?.email.configured
										? "Configurado"
										: "Não configurado"}
								</span>
							</div>
						</div>
						<div className="mt-2">
							{getStatusBadge(
								serviceStatus?.email.configured || false,
								serviceStatus?.email.provider || "None",
							)}
						</div>
						<Button
							variant="outline"
							size="sm"
							className="mt-3 w-full"
							onClick={() => handleTestConnection("email")}
							disabled={
								!serviceStatus?.email.configured || testingService === "email"
							}
						>
							{testingService === "email" ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									Testando...
								</>
							) : (
								"Testar Conexão"
							)}
						</Button>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="font-medium text-sm">SMS</CardTitle>
						<Phone className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="flex items-center justify-between">
							<div className="flex items-center space-x-2">
								{getStatusIcon(serviceStatus?.sms.configured || false)}
								<span className="text-sm">
									{serviceStatus?.sms.configured
										? "Configurado"
										: "Não configurado"}
								</span>
							</div>
						</div>
						<div className="mt-2">
							{getStatusBadge(
								serviceStatus?.sms.configured || false,
								serviceStatus?.sms.provider || "None",
							)}
						</div>
						<Button
							variant="outline"
							size="sm"
							className="mt-3 w-full"
							onClick={() => handleTestConnection("sms")}
							disabled={
								!serviceStatus?.sms.configured || testingService === "sms"
							}
						>
							{testingService === "sms" ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									Testando...
								</>
							) : (
								"Testar Conexão"
							)}
						</Button>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="font-medium text-sm">WhatsApp</CardTitle>
						<MessageSquare className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="flex items-center justify-between">
							<div className="flex items-center space-x-2">
								{getStatusIcon(serviceStatus?.whatsapp.configured || false)}
								<span className="text-sm">
									{serviceStatus?.whatsapp.configured
										? "Configurado"
										: "Não configurado"}
								</span>
							</div>
						</div>
						<div className="mt-2">
							{getStatusBadge(
								serviceStatus?.whatsapp.configured || false,
								serviceStatus?.whatsapp.provider || "None",
							)}
						</div>
						<Button
							variant="outline"
							size="sm"
							className="mt-3 w-full"
							onClick={() => handleTestConnection("whatsapp")}
							disabled={
								!serviceStatus?.whatsapp.configured ||
								testingService === "whatsapp"
							}
						>
							{testingService === "whatsapp" ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									Testando...
								</>
							) : (
								"Testar Conexão"
							)}
						</Button>
					</CardContent>
				</Card>
			</div>

			{/* Configuration Instructions */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<AlertCircle className="h-5 w-5" />
						Instruções de Configuração
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-6">
					<div>
						<h3 className="mb-3 font-semibold text-lg">
							Email (Escolha um provedor)
						</h3>
						<div className="space-y-4">
							<div>
								<h4 className="mb-2 font-medium text-sm">
									1. SMTP / Nodemailer
								</h4>
								<div className="grid gap-2 text-sm">
									<code className="rounded bg-gray-100 p-1">
										SMTP_HOST=smtp.gmail.com
									</code>
									<code className="rounded bg-gray-100 p-1">SMTP_PORT=587</code>
									<code className="rounded bg-gray-100 p-1">
										SMTP_SECURE=false
									</code>
									<code className="rounded bg-gray-100 p-1">
										SMTP_USER=seu@email.com
									</code>
									<code className="rounded bg-gray-100 p-1">
										SMTP_PASSWORD=sua_senha_app
									</code>
									<code className="rounded bg-gray-100 p-1">
										SMTP_FROM=noreply@seudominio.com
									</code>
								</div>
							</div>

							<div>
								<h4 className="mb-2 font-medium text-sm">2. SendGrid</h4>
								<div className="grid gap-2 text-sm">
									<code className="rounded bg-gray-100 p-1">
										SENDGRID_API_KEY=SG.xxxxx
									</code>
									<code className="rounded bg-gray-100 p-1">
										SENDGRID_FROM=noreply@seudominio.com
									</code>
								</div>
							</div>

							<div>
								<h4 className="mb-2 font-medium text-sm">3. Resend</h4>
								<div className="grid gap-2 text-sm">
									<code className="rounded bg-gray-100 p-1">
										RESEND_API_KEY=re_xxxxx
									</code>
									<code className="rounded bg-gray-100 p-1">
										RESEND_FROM=noreply@seudominio.com
									</code>
								</div>
							</div>
						</div>
					</div>

					<div>
						<h3 className="mb-3 font-semibold text-lg">
							SMS e WhatsApp (Twilio)
						</h3>
						<div className="grid gap-2 text-sm">
							<code className="rounded bg-gray-100 p-1">
								TWILIO_ACCOUNT_SID=ACxxxxx
							</code>
							<code className="rounded bg-gray-100 p-1">
								TWILIO_AUTH_TOKEN=xxxxx
							</code>
							<code className="rounded bg-gray-100 p-1">
								TWILIO_PHONE_NUMBER=+5511999999999
							</code>
							<code className="rounded bg-gray-100 p-1">
								TWILIO_WHATSAPP_NUMBER=+5511999999999
							</code>
						</div>
						<p className="mt-2 text-gray-600 text-sm">
							<strong>Nota:</strong> Para WhatsApp, você precisa ter um número
							aprovado pela Twilio ou usar o Twilio Sandbox para testes.
						</p>
					</div>

					<div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
						<div className="flex items-start gap-3">
							<AlertCircle className="mt-0.5 h-5 w-5 text-blue-600" />
							<div>
								<h4 className="font-medium text-blue-900">Importante</h4>
								<p className="mt-1 text-blue-700 text-sm">
									Após configurar as variáveis de ambiente, reinicie o servidor
									para que as mudanças tenham efeito. Os testes de conexão só
									funcionarão após a configuração correta das credenciais.
								</p>
							</div>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
