"use client";

import { Trash2, Upload, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "~/components/ui/select";
import { Textarea } from "~/components/ui/textarea";
import { api } from "~/trpc/react";

interface ServiceFormProps {
	service?: {
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
		[key: string]: unknown; // Allow additional properties from API
	} | null;
	onClose: () => void;
}

export function ServiceForm({ service, onClose }: ServiceFormProps) {
	const [formData, setFormData] = useState({
		title: "",
		description: "",
		price: "",
		priceType: "fixed" as "fixed" | "hourly",
		categoryId: "",
		duration: "",
		location: "",
		maxBookings: "",
		images: [] as string[],
	});

	const [errors, setErrors] = useState<Record<string, string>>({});
	const [isSubmitting, setIsSubmitting] = useState(false);

	const { data: categories } = api.category.list.useQuery({});

	const createServiceMutation = api.service.create.useMutation();
	const updateServiceMutation = api.service.update.useMutation();

	useEffect(() => {
		if (service) {
			setFormData({
				title: service.title || "",
				description: service.description || "",
				price: service.price?.toString() || "",
				priceType: service.priceType || "fixed",
				categoryId: service.categoryId || "",
				duration: service.duration?.toString() || "",
				location: service.location || "",
				maxBookings: service.maxBookings?.toString() || "",
				images: service.images?.map((img) => img.url) || [],
			});
		}
	}, [service]);

	const validateForm = () => {
		const newErrors: Record<string, string> = {};

		if (!formData.title.trim()) {
			newErrors.title = "Título é obrigatório";
		} else if (formData.title.length < 5) {
			newErrors.title = "Título deve ter pelo menos 5 caracteres";
		}

		if (!formData.description.trim()) {
			newErrors.description = "Descrição é obrigatória";
		} else if (formData.description.length < 20) {
			newErrors.description = "Descrição deve ter pelo menos 20 caracteres";
		}

		if (!formData.price) {
			newErrors.price = "Preço é obrigatório";
		} else if (Number(formData.price) <= 0) {
			newErrors.price = "Preço deve ser maior que zero";
		}

		if (!formData.categoryId) {
			newErrors.categoryId = "Categoria é obrigatória";
		}

		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!validateForm()) {
			return;
		}

		setIsSubmitting(true);

		try {
			const submitData = {
				title: formData.title.trim(),
				description: formData.description.trim(),
				price: Number(formData.price),
				priceType: formData.priceType,
				categoryId: formData.categoryId,
				duration: formData.duration ? Number(formData.duration) : undefined,
				location: formData.location.trim() || undefined,
				maxBookings: formData.maxBookings
					? Number(formData.maxBookings)
					: undefined,
				images: formData.images,
			};

			if (service) {
				await updateServiceMutation.mutateAsync({
					serviceId: service.id,
					...submitData,
				});
			} else {
				await createServiceMutation.mutateAsync(submitData);
			}

			onClose();
		} catch (error) {
			console.error("Error saving service:", error);
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleImageAdd = () => {
		const url = prompt("Digite a URL da imagem:");
		if (url?.trim()) {
			setFormData((prev) => ({
				...prev,
				images: [...prev.images, url.trim()],
			}));
		}
	};

	const handleImageRemove = (imageUrl: string) => {
		setFormData((prev) => ({
			...prev,
			images: prev.images.filter((url) => url !== imageUrl),
		}));
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
			<Card className="max-h-[90vh] w-full max-w-2xl overflow-y-auto">
				<CardHeader className="flex flex-row items-center justify-between">
					<CardTitle>
						{service ? "Editar Serviço" : "Criar Novo Serviço"}
					</CardTitle>
					<Button variant="ghost" size="sm" onClick={onClose}>
						<X className="h-4 w-4" />
					</Button>
				</CardHeader>

				<CardContent>
					<form onSubmit={handleSubmit} className="space-y-6">
						{/* Basic Info */}
						<div className="space-y-4">
							<div>
								<Label htmlFor="title">Título do Serviço</Label>
								<Input
									id="title"
									value={formData.title}
									onChange={(e) =>
										setFormData((prev) => ({ ...prev, title: e.target.value }))
									}
									placeholder="Ex: Limpeza residencial completa"
									className={errors.title ? "border-red-500" : ""}
								/>
								{errors.title && (
									<p className="mt-1 text-red-500 text-sm">{errors.title}</p>
								)}
							</div>

							<div>
								<Label htmlFor="description">Descrição</Label>
								<Textarea
									id="description"
									value={formData.description}
									onChange={(e) =>
										setFormData((prev) => ({
											...prev,
											description: e.target.value,
										}))
									}
									placeholder="Descreva detalhadamente o que está incluído no seu serviço..."
									rows={4}
									className={errors.description ? "border-red-500" : ""}
								/>
								{errors.description && (
									<p className="mt-1 text-red-500 text-sm">
										{errors.description}
									</p>
								)}
							</div>

							<div className="grid grid-cols-2 gap-4">
								<div>
									<Label htmlFor="category">Categoria</Label>
									<Select
										value={formData.categoryId}
										onValueChange={(value: string) =>
											setFormData((prev) => ({ ...prev, categoryId: value }))
										}
									>
										<SelectTrigger
											className={errors.categoryId ? "border-red-500" : ""}
										>
											<SelectValue placeholder="Selecione uma categoria" />
										</SelectTrigger>
										<SelectContent>
											{categories?.map((category) => (
												<SelectItem key={category.id} value={category.id}>
													{category.name}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
									{errors.categoryId && (
										<p className="mt-1 text-red-500 text-sm">
											{errors.categoryId}
										</p>
									)}
								</div>

								<div>
									<Label htmlFor="location">Localização (Opcional)</Label>
									<Input
										id="location"
										value={formData.location}
										onChange={(e) =>
											setFormData((prev) => ({
												...prev,
												location: e.target.value,
											}))
										}
										placeholder="Ex: São Paulo, SP"
									/>
								</div>
							</div>
						</div>

						{/* Pricing */}
						<div className="space-y-4">
							<h3 className="font-semibold text-lg">Preço</h3>

							<div className="grid grid-cols-2 gap-4">
								<div>
									<Label htmlFor="priceType">Tipo de Preço</Label>
									<Select
										value={formData.priceType}
										onValueChange={(value: "fixed" | "hourly") =>
											setFormData((prev) => ({ ...prev, priceType: value }))
										}
									>
										<SelectTrigger>
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="fixed">Preço Fixo</SelectItem>
											<SelectItem value="hourly">Por Hora</SelectItem>
										</SelectContent>
									</Select>
								</div>

								<div>
									<Label htmlFor="price">
										Preço (R$) {formData.priceType === "hourly" && "por hora"}
									</Label>
									<Input
										id="price"
										type="number"
										step="0.01"
										min="0"
										value={formData.price}
										onChange={(e) =>
											setFormData((prev) => ({
												...prev,
												price: e.target.value,
											}))
										}
										placeholder="0.00"
										className={errors.price ? "border-red-500" : ""}
									/>
									{errors.price && (
										<p className="mt-1 text-red-500 text-sm">{errors.price}</p>
									)}
								</div>
							</div>
						</div>

						{/* Additional Options */}
						<div className="space-y-4">
							<h3 className="font-semibold text-lg">Opções Adicionais</h3>

							<div className="grid grid-cols-2 gap-4">
								<div>
									<Label htmlFor="duration">Duração (minutos)</Label>
									<Input
										id="duration"
										type="number"
										min="15"
										value={formData.duration}
										onChange={(e) =>
											setFormData((prev) => ({
												...prev,
												duration: e.target.value,
											}))
										}
										placeholder="Ex: 120"
									/>
								</div>

								<div>
									<Label htmlFor="maxBookings">Máx. Agendamentos/Dia</Label>
									<Input
										id="maxBookings"
										type="number"
										min="1"
										value={formData.maxBookings}
										onChange={(e) =>
											setFormData((prev) => ({
												...prev,
												maxBookings: e.target.value,
											}))
										}
										placeholder="Ex: 3"
									/>
								</div>
							</div>
						</div>

						{/* Images */}
						<div className="space-y-4">
							<div className="flex items-center justify-between">
								<h3 className="font-semibold text-lg">Imagens</h3>
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={handleImageAdd}
									className="flex items-center space-x-2"
								>
									<Upload className="h-4 w-4" />
									<span>Adicionar URL</span>
								</Button>
							</div>

							{formData.images.length > 0 ? (
								<div className="grid grid-cols-2 gap-4">
									{formData.images.map((imageUrl) => (
										<div key={imageUrl} className="group relative">
											<div className="relative aspect-video overflow-hidden rounded-lg">
												<Image
													src={imageUrl}
													alt="Imagem do serviço"
													fill
													className="object-cover"
												/>
											</div>
											<Button
												type="button"
												variant="destructive"
												size="sm"
												className="absolute top-2 right-2 opacity-0 transition-opacity group-hover:opacity-100"
												onClick={() => handleImageRemove(imageUrl)}
											>
												<Trash2 className="h-4 w-4" />
											</Button>
										</div>
									))}
								</div>
							) : (
								<div className="rounded-lg border-2 border-gray-300 border-dashed py-8 text-center text-gray-500">
									<Upload className="mx-auto mb-4 h-12 w-12 text-gray-400" />
									<p>Nenhuma imagem adicionada</p>
									<p className="text-sm">
										Clique em "Adicionar URL" para começar
									</p>
								</div>
							)}
						</div>

						{/* Form Actions */}
						<div className="flex justify-end space-x-4 border-t pt-6">
							<Button type="button" variant="outline" onClick={onClose}>
								Cancelar
							</Button>
							<Button type="submit" disabled={isSubmitting}>
								{isSubmitting
									? "Salvando..."
									: service
										? "Atualizar"
										: "Criar Serviço"}
							</Button>
						</div>
					</form>
				</CardContent>
			</Card>
		</div>
	);
}
