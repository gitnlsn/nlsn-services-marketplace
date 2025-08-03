"use client";

import { StarIcon as StarOutlineIcon } from "@heroicons/react/24/outline";
import {
	ClockIcon,
	EnvelopeIcon,
	MapPinIcon,
	PhoneIcon,
	StarIcon,
} from "@heroicons/react/24/solid";
import Image from "next/image";
import { useState } from "react";
import { BookingModal } from "~/components/booking/booking-modal";
import { MessageButton } from "~/components/messaging/message-button";
import { PriceDisplay } from "~/components/ui/price-display";
import { api } from "~/trpc/react";
import { BookingWidget } from "./booking-widget";
import { ServiceGallery } from "./service-gallery";

interface ServiceDetailProps {
	serviceId: string;
}

export function ServiceDetail({ serviceId }: ServiceDetailProps) {
	const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

	const { data: service, isLoading } = api.service.getById.useQuery({
		serviceId,
	});

	if (isLoading) {
		return (
			<div className="min-h-screen bg-gray-50 py-8">
				<div className="container mx-auto px-4">
					<div className="animate-pulse">
						<div className="mb-8 h-96 rounded-lg bg-gray-300" />
						<div className="mb-4 h-8 rounded bg-gray-300" />
						<div className="mb-2 h-4 rounded bg-gray-300" />
						<div className="h-4 w-3/4 rounded bg-gray-300" />
					</div>
				</div>
			</div>
		);
	}

	if (!service) {
		return (
			<div className="min-h-screen bg-gray-50 py-8">
				<div className="container mx-auto px-4 text-center">
					<h1 className="mb-4 font-bold text-2xl text-gray-900">
						Serviço não encontrado
					</h1>
					<p className="text-gray-600">
						O serviço que você está procurando não existe ou foi removido.
					</p>
				</div>
			</div>
		);
	}

	const rating = service.avgRating || 0;

	return (
		<div className="min-h-screen bg-gray-50 py-8">
			<div className="container mx-auto px-4">
				<div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
					{/* Main Content */}
					<div className="lg:col-span-2">
						{/* Enhanced Image Gallery */}
						<ServiceGallery
							images={service.images}
							serviceName={service.title}
						/>

						{/* Service Info */}
						<div className="mb-8 rounded-lg bg-white p-6 shadow-md">
							<div className="mb-4">
								<span className="inline-block rounded-full bg-indigo-100 px-3 py-1 font-medium text-indigo-800 text-sm">
									{service.category.name}
								</span>
							</div>

							<h1 className="mb-4 font-bold text-3xl text-gray-900">
								{service.title}
							</h1>

							<div className="mb-4 flex items-center">
								<div className="mr-4 flex items-center">
									{[1, 2, 3, 4, 5].map((star) => (
										<div key={star}>
											{star <= Math.floor(rating) ? (
												<StarIcon className="h-5 w-5 text-yellow-400" />
											) : (
												<StarOutlineIcon className="h-5 w-5 text-gray-300" />
											)}
										</div>
									))}
								</div>
								<span className="text-gray-600">
									{rating.toFixed(1)} ({service._count.reviews} avaliações)
								</span>
								<span className="mx-2 text-gray-400">•</span>
								<span className="text-gray-600">
									{service._count.bookings} agendamentos
								</span>
							</div>

							{service.location && (
								<div className="mb-4 flex items-center text-gray-600">
									<MapPinIcon className="mr-2 h-5 w-5" />
									<span>{service.location}</span>
								</div>
							)}

							{service.duration && (
								<div className="mb-6 flex items-center text-gray-600">
									<ClockIcon className="mr-2 h-5 w-5" />
									<span>Duração estimada: {service.duration} minutos</span>
								</div>
							)}

							<div className="prose max-w-none">
								<h3 className="mb-3 font-semibold text-gray-900 text-lg">
									Descrição do Serviço
								</h3>
								<p className="text-gray-600 leading-relaxed">
									{service.description}
								</p>
							</div>
						</div>

						{/* Reviews */}
						<div className="rounded-lg bg-white p-6 shadow-md">
							<h3 className="mb-4 font-semibold text-gray-900 text-lg">
								Avaliações dos Clientes
							</h3>
							{service.reviews.length > 0 ? (
								<div className="space-y-4">
									{service.reviews.map((review) => (
										<div
											key={review.id}
											className="border-gray-200 border-b pb-4"
										>
											<div className="mb-2 flex items-center">
												<div className="relative mr-3 h-8 w-8 overflow-hidden rounded-full">
													<Image
														src={
															review.client.image || "/placeholder-avatar.jpg"
														}
														alt={review.client.name || "Cliente"}
														fill
														className="object-cover"
													/>
												</div>
												<div>
													<p className="font-medium text-gray-900">
														{review.client.name || "Cliente"}
													</p>
													<div className="flex items-center">
														{[1, 2, 3, 4, 5].map((star) => (
															<div key={star}>
																{star <= review.rating ? (
																	<StarIcon className="h-4 w-4 text-yellow-400" />
																) : (
																	<StarOutlineIcon className="h-4 w-4 text-gray-300" />
																)}
															</div>
														))}
													</div>
												</div>
											</div>
											{review.comment && (
												<p className="ml-11 text-gray-600">{review.comment}</p>
											)}
										</div>
									))}
								</div>
							) : (
								<p className="text-gray-500">
									Ainda não há avaliações para este serviço.
								</p>
							)}
						</div>
					</div>

					{/* Sidebar */}
					<div className="lg:col-span-1">
						{/* Enhanced Booking Widget */}
						<BookingWidget
							service={{
								id: service.id,
								title: service.title,
								price: service.price,
								priceType: service.priceType as "fixed" | "hourly",
								duration: service.duration || undefined,
								location: service.location || undefined,
								provider: {
									id: service.provider.id,
									name: service.provider.name || undefined,
									image: service.provider.image || undefined,
								},
							}}
							rating={rating}
							reviewCount={service._count.reviews}
							onBookingClick={() => setIsBookingModalOpen(true)}
						/>
					</div>
				</div>
			</div>

			{/* Booking Modal */}
			<BookingModal
				isOpen={isBookingModalOpen}
				onClose={() => setIsBookingModalOpen(false)}
				service={{
					id: service.id,
					title: service.title,
					price: service.price,
					priceType: service.priceType as "fixed" | "hourly",
					duration: service.duration,
					location: service.location,
					provider: {
						name: service.provider.name,
						image: service.provider.image,
					},
				}}
			/>
		</div>
	);
}
