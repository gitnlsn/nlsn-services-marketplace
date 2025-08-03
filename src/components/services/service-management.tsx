"use client";

import { Edit, Eye, MoreVertical, Plus, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ServiceForm } from "~/components/services/service-form";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { PriceDisplay } from "~/components/ui/price-display";
import { StatusBadge } from "~/components/ui/status-badge";
import { api } from "~/trpc/react";

export function ServiceManagement() {
	const [isFormOpen, setIsFormOpen] = useState(false);
	const [editingService, setEditingService] = useState<{
		id: string;
		title: string;
		description: string;
		price: number;
		priceType: string;
		categoryId: string;
		duration?: number;
		location?: string;
		maxBookings?: number;
		images?: Array<{ url: string; [key: string]: unknown }>;
		[key: string]: unknown;
	} | null>(null);

	const {
		data: services,
		isLoading,
		refetch,
	} = api.service.listMyServices.useQuery({
		status: "all",
		limit: 50,
	});

	const deleteServiceMutation = api.service.delete.useMutation({
		onSuccess: () => {
			void refetch();
		},
	});

	const updateStatusMutation = api.service.updateStatus.useMutation({
		onSuccess: () => {
			void refetch();
		},
	});

	const handleDelete = async (serviceId: string) => {
		if (window.confirm("Tem certeza que deseja excluir este serviço?")) {
			try {
				await deleteServiceMutation.mutateAsync({ serviceId });
			} catch (error) {
				console.error("Error deleting service:", error);
			}
		}
	};

	const handleStatusToggle = async (
		serviceId: string,
		currentStatus: string,
	) => {
		const newStatus = currentStatus === "active" ? "inactive" : "active";
		try {
			await updateStatusMutation.mutateAsync({
				serviceId,
				status: newStatus,
			});
		} catch (error) {
			console.error("Error updating service status:", error);
		}
	};

	const handleEdit = (service: NonNullable<typeof services>["services"][0]) => {
		setEditingService({
			id: service.id,
			title: service.title,
			description: service.description,
			price: service.price,
			priceType: service.priceType,
			categoryId: service.categoryId,
			duration: service.duration ?? undefined,
			location: service.location ?? undefined,
			maxBookings: service.maxBookings ?? undefined,
			images: service.images,
		});
		setIsFormOpen(true);
	};

	const handleFormClose = () => {
		setIsFormOpen(false);
		setEditingService(null);
		void refetch();
	};

	if (isLoading) {
		return (
			<div className="container mx-auto px-4 py-8">
				<div className="animate-pulse">
					<div className="mb-8 flex items-center justify-between">
						<div className="h-8 w-64 rounded bg-gray-200" />
						<div className="h-10 w-32 rounded bg-gray-200" />
					</div>
					<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
						{Array.from({ length: 6 }).map(() => (
							<Card key={crypto.randomUUID()}>
								<div className="aspect-video bg-gray-200" />
								<CardContent>
									<div className="mb-2 h-4 rounded bg-gray-200" />
									<div className="mb-2 h-3 w-3/4 rounded bg-gray-200" />
									<div className="h-3 w-1/2 rounded bg-gray-200" />
								</CardContent>
							</Card>
						))}
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="container mx-auto px-4 py-8">
			{/* Header */}
			<div className="mb-8 flex items-center justify-between">
				<div>
					<h1 className="font-bold text-3xl text-gray-900">Meus Serviços</h1>
					<p className="text-gray-600">
						Gerencie seus serviços e acompanhe o desempenho
					</p>
				</div>
				<Button
					onClick={() => setIsFormOpen(true)}
					className="flex items-center space-x-2"
				>
					<Plus className="h-4 w-4" />
					<span>Novo Serviço</span>
				</Button>
			</div>

			{/* Services Grid */}
			{services?.services && services.services.length > 0 ? (
				<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
					{services.services.map((service) => (
						<Card key={service.id} className="overflow-hidden">
							<div className="relative aspect-video">
								{service.images?.[0] ? (
									<Image
										src={service.images[0].url}
										alt={service.title}
										fill
										className="object-cover"
									/>
								) : (
									<div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-100 to-indigo-100">
										<span className="font-semibold text-2xl text-indigo-600">
											{service.category.name.charAt(0)}
										</span>
									</div>
								)}
								<div className="absolute top-2 right-2">
									<StatusBadge status={service.status} type="service" />
								</div>
							</div>

							<CardContent>
								<div className="mb-2 flex items-start justify-between">
									<h3 className="line-clamp-2 font-semibold text-gray-900 text-lg">
										{service.title}
									</h3>
									<DropdownMenu>
										<DropdownMenuTrigger asChild>
											<Button variant="ghost" size="sm">
												<MoreVertical className="h-4 w-4" />
											</Button>
										</DropdownMenuTrigger>
										<DropdownMenuContent align="end">
											<DropdownMenuItem asChild>
												<Link href={`/services/${service.id}`}>
													<Eye className="mr-2 h-4 w-4" />
													Visualizar
												</Link>
											</DropdownMenuItem>
											<DropdownMenuItem onClick={() => handleEdit(service)}>
												<Edit className="mr-2 h-4 w-4" />
												Editar
											</DropdownMenuItem>
											<DropdownMenuItem
												onClick={() =>
													handleStatusToggle(service.id, service.status)
												}
											>
												{service.status === "active" ? "Desativar" : "Ativar"}
											</DropdownMenuItem>
											<DropdownMenuItem
												onClick={() => handleDelete(service.id)}
												className="text-red-600"
											>
												<Trash2 className="mr-2 h-4 w-4" />
												Excluir
											</DropdownMenuItem>
										</DropdownMenuContent>
									</DropdownMenu>
								</div>

								<p className="mb-3 line-clamp-2 text-gray-600 text-sm">
									{service.description}
								</p>

								<div className="mb-3 flex items-center justify-between">
									<Badge variant="outline">{service.category.name}</Badge>
									<PriceDisplay
										amount={service.price}
										type={service.priceType as "fixed" | "hourly"}
										className="font-semibold text-indigo-600"
									/>
								</div>

								<div className="flex items-center justify-between text-gray-500 text-sm">
									<span>{service._count?.bookings || 0} contratações</span>
									<span>
										{service.avgRating
											? `${service.avgRating.toFixed(1)} ⭐`
											: "Sem avaliações"}
									</span>
								</div>
							</CardContent>
						</Card>
					))}
				</div>
			) : (
				<div className="py-12 text-center">
					<div className="mb-4 flex justify-center">
						<div className="rounded-full bg-gray-100 p-6">
							<Plus className="h-12 w-12 text-gray-400" />
						</div>
					</div>
					<h3 className="mb-2 font-semibold text-gray-900 text-lg">
						Nenhum serviço cadastrado
					</h3>
					<p className="mb-6 text-gray-600">
						Comece criando seu primeiro serviço para atrair clientes.
					</p>
					<Button onClick={() => setIsFormOpen(true)}>
						Criar Primeiro Serviço
					</Button>
				</div>
			)}

			{/* Service Form Modal */}
			{isFormOpen && (
				<ServiceForm service={editingService} onClose={handleFormClose} />
			)}
		</div>
	);
}
