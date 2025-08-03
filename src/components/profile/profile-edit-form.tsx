"use client";

import { Camera, Loader2, Save, X } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { ImageUpload } from "~/components/ui/image-upload";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { api } from "~/trpc/react";

interface ProfileEditFormProps {
	user: {
		id: string;
		name?: string | null;
		email?: string | null;
		image?: string | null;
		bio?: string | null;
		phone?: string | null;
		isProfessional?: boolean;
		professionalSince?: Date | null;
	};
}

export function ProfileEditForm({ user }: ProfileEditFormProps) {
	const [isEditing, setIsEditing] = useState(false);
	const [formData, setFormData] = useState({
		name: user.name || "",
		email: user.email || "",
		bio: user.bio || "",
		phone: user.phone || "",
		image: user.image || "",
	});

	const utils = api.useUtils();

	const updateProfile = api.user.updateProfile.useMutation({
		onSuccess: () => {
			utils.user.getCurrentUser.invalidate();
			setIsEditing(false);
		},
		onError: (error) => {
			alert(`Erro ao atualizar perfil: ${error.message}`);
		},
	});

	const becomeProfessional = api.user.becomeProfessional.useMutation({
		onSuccess: () => {
			utils.user.getCurrentUser.invalidate();
			alert("Agora você é um profissional! Você pode criar serviços.");
		},
		onError: (error) => {
			alert(`Erro ao se tornar profissional: ${error.message}`);
		},
	});

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		updateProfile.mutate({
			name: formData.name.trim() || undefined,
			bio: formData.bio.trim() || undefined,
			phone: formData.phone.trim() || undefined,
			image: formData.image.trim() || undefined,
		});
	};

	const handleCancel = () => {
		setIsEditing(false);
		setFormData({
			name: user.name || "",
			email: user.email || "",
			bio: user.bio || "",
			phone: user.phone || "",
			image: user.image || "",
		});
	};

	const handleImageChange = (imageUrl: string | string[]) => {
		const url = Array.isArray(imageUrl) ? imageUrl[0] : imageUrl;
		setFormData((prev) => ({ ...prev, image: url || "" }));
	};

	if (!isEditing) {
		return (
			<Card>
				<CardHeader className="flex flex-row items-center justify-between">
					<CardTitle>Informações Pessoais</CardTitle>
					<Button
						variant="outline"
						size="sm"
						onClick={() => setIsEditing(true)}
					>
						Editar Perfil
					</Button>
				</CardHeader>
				<CardContent>
					<div className="space-y-6">
						{/* Profile Image */}
						<div className="flex items-center space-x-6">
							<div className="relative h-24 w-24 overflow-hidden rounded-full bg-gray-200">
								{user.image ? (
									<Image
										src={user.image}
										alt={user.name || "Profile"}
										fill
										className="object-cover"
									/>
								) : (
									<div className="flex h-full w-full items-center justify-center font-medium text-2xl text-gray-600">
										{user.name?.[0]?.toUpperCase() || "U"}
									</div>
								)}
							</div>
							<div>
								<h3 className="font-semibold text-xl">
									{user.name || "Usuário"}
								</h3>
								<p className="text-gray-600">{user.email}</p>
								{user.isProfessional && (
									<p className="mt-1 font-medium text-green-600 text-sm">
										Profissional verificado
									</p>
								)}
							</div>
						</div>

						{/* Details */}
						<div className="grid gap-4 md:grid-cols-2">
							<div>
								<Label className="text-gray-600">Telefone</Label>
								<p className="font-medium">{user.phone || "Não informado"}</p>
							</div>
							{user.isProfessional && user.professionalSince && (
								<div>
									<Label className="text-gray-600">Profissional desde</Label>
									<p className="font-medium">
										{new Date(user.professionalSince).toLocaleDateString(
											"pt-BR",
										)}
									</p>
								</div>
							)}
						</div>

						{user.bio && (
							<div>
								<Label className="text-gray-600">Sobre</Label>
								<p className="mt-1 text-gray-900">{user.bio}</p>
							</div>
						)}

						{/* Become Professional */}
						{!user.isProfessional && (
							<div className="border-t pt-6">
								<div className="flex items-center justify-between">
									<div>
										<h4 className="font-semibold">Tornar-se Profissional</h4>
										<p className="text-gray-600 text-sm">
											Ofereça seus serviços na plataforma
										</p>
									</div>
									<Button
										onClick={() => becomeProfessional.mutate()}
										disabled={becomeProfessional.isPending}
									>
										{becomeProfessional.isPending ? (
											<>
												<Loader2 className="mr-2 h-4 w-4 animate-spin" />
												Processando...
											</>
										) : (
											"Ativar Conta Profissional"
										)}
									</Button>
								</div>
							</div>
						)}
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle>Editar Perfil</CardTitle>
			</CardHeader>
			<CardContent>
				<form onSubmit={handleSubmit} className="space-y-6">
					{/* Profile Image */}
					<div className="space-y-4">
						<Label>Foto de Perfil</Label>
						<div className="flex items-start space-x-6">
							<div className="relative h-24 w-24 overflow-hidden rounded-full bg-gray-200">
								{formData.image ? (
									<Image
										src={formData.image}
										alt="Profile"
										fill
										className="object-cover"
									/>
								) : (
									<div className="flex h-full w-full items-center justify-center font-medium text-2xl text-gray-600">
										{formData.name?.[0]?.toUpperCase() || "U"}
									</div>
								)}
							</div>
							<div className="flex-1">
								<ImageUpload
									value={formData.image}
									onChange={handleImageChange}
									maxFiles={1}
									maxSize={2}
									className="max-w-sm"
								/>
								<p className="mt-2 text-gray-500 text-sm">
									Recomendamos uma imagem quadrada de pelo menos 200x200 pixels.
								</p>
							</div>
						</div>
					</div>

					{/* Form Fields */}
					<div className="grid gap-4 md:grid-cols-2">
						<div>
							<Label htmlFor="name">Nome</Label>
							<Input
								id="name"
								value={formData.name}
								onChange={(e) =>
									setFormData((prev) => ({ ...prev, name: e.target.value }))
								}
								placeholder="Seu nome completo"
							/>
						</div>
						<div>
							<Label htmlFor="email">Email</Label>
							<Input
								id="email"
								value={formData.email}
								disabled
								className="bg-gray-50"
							/>
							<p className="mt-1 text-gray-500 text-xs">
								O email não pode ser alterado
							</p>
						</div>
					</div>

					<div>
						<Label htmlFor="phone">Telefone</Label>
						<Input
							id="phone"
							value={formData.phone}
							onChange={(e) =>
								setFormData((prev) => ({ ...prev, phone: e.target.value }))
							}
							placeholder="(11) 99999-9999"
						/>
					</div>

					<div>
						<Label htmlFor="bio">Sobre você</Label>
						<Textarea
							id="bio"
							value={formData.bio}
							onChange={(e) =>
								setFormData((prev) => ({ ...prev, bio: e.target.value }))
							}
							placeholder="Conte um pouco sobre você..."
							rows={4}
						/>
					</div>

					{/* Actions */}
					<div className="flex justify-end space-x-3">
						<Button
							type="button"
							variant="outline"
							onClick={handleCancel}
							disabled={updateProfile.isPending}
						>
							<X className="mr-2 h-4 w-4" />
							Cancelar
						</Button>
						<Button type="submit" disabled={updateProfile.isPending}>
							{updateProfile.isPending ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									Salvando...
								</>
							) : (
								<>
									<Save className="mr-2 h-4 w-4" />
									Salvar Alterações
								</>
							)}
						</Button>
					</div>
				</form>
			</CardContent>
		</Card>
	);
}
