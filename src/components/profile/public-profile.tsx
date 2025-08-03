"use client";

import { Calendar, MapPin, Shield, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { MessageButton } from "~/components/messaging/message-button";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { api } from "~/trpc/react";

interface PublicProfileProps {
	userId: string;
}

export function PublicProfile({ userId }: PublicProfileProps) {
	const { data: profile, isLoading } = api.user.getById.useQuery({
		id: userId,
	});

	const { data: services } = api.service.listByProvider.useQuery(
		{ providerId: userId },
		{ enabled: profile?.isProfessional === true },
	);

	if (isLoading) {
		return (
			<div className="container mx-auto px-4 py-8">
				<div className="animate-pulse">
					<div className="mb-8 flex items-center space-x-6">
						<div className="h-32 w-32 rounded-full bg-gray-300" />
						<div className="space-y-3">
							<div className="h-8 w-64 rounded bg-gray-300" />
							<div className="h-4 w-48 rounded bg-gray-300" />
							<div className="h-4 w-32 rounded bg-gray-300" />
						</div>
					</div>
				</div>
			</div>
		);
	}

	if (!profile) {
		return (
			<div className="container mx-auto px-4 py-8 text-center">
				<h1 className="mb-4 font-bold text-2xl text-gray-900">
					Perfil não encontrado
				</h1>
				<p className="text-gray-600">
					O perfil que você está procurando não existe.
				</p>
			</div>
		);
	}

	const formatDate = (date: Date | null) => {
		if (!date) return "N/A";
		return new Intl.DateTimeFormat("pt-BR", {
			year: "numeric",
			month: "long",
		}).format(new Date(date));
	};

	return (
		<div className="container mx-auto px-4 py-8">
			{/* Profile Header */}
			<div className="mb-8">
				<div className="flex flex-col items-center gap-6 md:flex-row md:items-start">
					{/* Profile Image */}
					<div className="relative h-32 w-32 overflow-hidden rounded-full bg-gray-200">
						{profile.image ? (
							<Image
								src={profile.image}
								alt={profile.name || "Profile"}
								fill
								className="object-cover"
							/>
						) : (
							<div className="flex h-full w-full items-center justify-center font-medium text-4xl text-gray-600">
								{profile.name?.[0]?.toUpperCase() || "U"}
							</div>
						)}
					</div>

					{/* Profile Info */}
					<div className="flex-1 text-center md:text-left">
						<div className="mb-2 flex items-center justify-center gap-3 md:justify-start">
							<h1 className="font-bold text-3xl text-gray-900">
								{profile.name || "Usuário"}
							</h1>
							{profile.isProfessional && (
								<Badge className="bg-green-100 text-green-800">
									<Shield className="mr-1 h-3 w-3" />
									Verificado
								</Badge>
							)}
						</div>

						{profile.bio && (
							<p className="mb-4 max-w-2xl text-gray-600">{profile.bio}</p>
						)}

						<div className="mb-4 flex flex-wrap items-center justify-center gap-4 text-gray-500 text-sm md:justify-start">
							{profile.isProfessional && (
								<>
									<div className="flex items-center gap-1">
										<Calendar className="h-4 w-4" />
										<span>
											Profissional desde {formatDate(profile.professionalSince)}
										</span>
									</div>
									{services && (
										<div className="flex items-center gap-1">
											<Star className="h-4 w-4" />
											<span>{services.services.length} serviços ativos</span>
										</div>
									)}
								</>
							)}
						</div>

						<div className="flex flex-wrap justify-center gap-3 md:justify-start">
							<MessageButton
								participantId={profile.id}
								participantName={profile.name || undefined}
							/>
							{profile.isProfessional && (
								<Link href={`/search?provider=${profile.id}`}>
									<Button variant="outline" size="lg">
										Ver Todos os Serviços
									</Button>
								</Link>
							)}
						</div>
					</div>
				</div>
			</div>

			{/* Services Section (for professionals) */}
			{profile.isProfessional &&
				services?.services &&
				services.services.length > 0 && (
					<div>
						<h2 className="mb-6 font-bold text-2xl text-gray-900">
							Serviços Oferecidos
						</h2>
						<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
							{services.services.map((service) => (
								<Link key={service.id} href={`/services/${service.id}`}>
									<Card className="hover:-translate-y-1 h-full transition-all hover:shadow-lg">
										<div className="relative aspect-video overflow-hidden rounded-t-lg">
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
											<div className="absolute top-2 right-2 rounded-full bg-white px-2 py-1 font-medium text-gray-900 text-sm shadow-sm">
												R$ {service.price.toFixed(2)}
												{service.priceType === "hourly" && "/h"}
											</div>
										</div>
										<CardContent className="p-4">
											<Badge variant="outline" className="mb-2">
												{service.category.name}
											</Badge>
											<h3 className="mb-2 line-clamp-2 font-semibold text-gray-900 text-lg">
												{service.title}
											</h3>
											<p className="mb-3 line-clamp-2 text-gray-600 text-sm">
												{service.description}
											</p>
											<div className="flex items-center justify-between text-sm">
												<div className="flex items-center gap-1">
													<Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
													<span className="font-medium">
														{service.avgRating?.toFixed(1) || "5.0"}
													</span>
													<span className="text-gray-500">(0)</span>
												</div>
												{service.location && (
													<div className="flex items-center gap-1 text-gray-500">
														<MapPin className="h-4 w-4" />
														<span>{service.location.split(",")[0]}</span>
													</div>
												)}
											</div>
										</CardContent>
									</Card>
								</Link>
							))}
						</div>
					</div>
				)}

			{/* Reviews Section */}
			{profile.isProfessional && false && (
				<div className="mt-12">
					<h2 className="mb-6 font-bold text-2xl text-gray-900">
						Avaliações Recentes
					</h2>
					<Card>
						<CardContent className="p-6">
							<p className="text-center text-gray-500">
								As avaliações aparecerão aqui
							</p>
						</CardContent>
					</Card>
				</div>
			)}
		</div>
	);
}
