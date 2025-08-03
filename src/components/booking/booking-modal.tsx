"use client";

import { Dialog, Transition } from "@headlessui/react";
import { Fragment, useState } from "react";
import { Button } from "~/components/ui/button";
import { Calendar, Clock, X } from "~/components/ui/icon";
import { PriceDisplay } from "~/components/ui/price-display";
import { api } from "~/trpc/react";

interface BookingModalProps {
	isOpen: boolean;
	onClose: () => void;
	service: {
		id: string;
		title: string;
		price: number;
		priceType: "fixed" | "hourly";
		duration?: number | null;
		location?: string | null;
		provider: {
			name: string | null;
			image: string | null;
		};
	};
}

export function BookingModal({ isOpen, onClose, service }: BookingModalProps) {
	const [bookingDate, setBookingDate] = useState("");
	const [bookingTime, setBookingTime] = useState("");
	const [endTime, setEndTime] = useState("");
	const [notes, setNotes] = useState("");
	const [address, setAddress] = useState(service.location || "");

	const createBooking = api.booking.create.useMutation({
		onSuccess: () => {
			onClose();
			// Show success message
			alert("Agendamento solicitado com sucesso!");
		},
		onError: (error) => {
			alert(`Erro ao criar agendamento: ${error.message}`);
		},
	});

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();

		if (!bookingDate || !bookingTime) {
			alert("Por favor, selecione data e horário");
			return;
		}

		const bookingDateTime = new Date(`${bookingDate}T${bookingTime}`);
		let endDateTime: Date | undefined;

		if (service.priceType === "hourly" && endTime) {
			endDateTime = new Date(`${bookingDate}T${endTime}`);
		} else if (service.duration) {
			endDateTime = new Date(
				bookingDateTime.getTime() + service.duration * 60000,
			);
		}

		createBooking.mutate({
			serviceId: service.id,
			bookingDate: bookingDateTime,
			endDate: endDateTime,
			notes: notes.trim() || undefined,
			address: address.trim() || undefined,
		});
	};

	const calculatePrice = () => {
		if (service.priceType === "fixed") {
			return service.price;
		}

		if (bookingTime && endTime) {
			const start = new Date(`2000-01-01T${bookingTime}`);
			const end = new Date(`2000-01-01T${endTime}`);
			const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
			return service.price * Math.max(1, hours);
		}

		return service.price;
	};

	// Get minimum date (today)
	const today = new Date().toISOString().split("T")[0];

	return (
		<Transition appear show={isOpen} as={Fragment}>
			<Dialog as="div" className="relative z-50" onClose={onClose}>
				<Transition.Child
					as={Fragment}
					enter="ease-out duration-300"
					enterFrom="opacity-0"
					enterTo="opacity-100"
					leave="ease-in duration-200"
					leaveFrom="opacity-100"
					leaveTo="opacity-0"
				>
					<div className="fixed inset-0 bg-black bg-opacity-25" />
				</Transition.Child>

				<div className="fixed inset-0 overflow-y-auto">
					<div className="flex min-h-full items-center justify-center p-4 text-center">
						<Transition.Child
							as={Fragment}
							enter="ease-out duration-300"
							enterFrom="opacity-0 scale-95"
							enterTo="opacity-100 scale-100"
							leave="ease-in duration-200"
							leaveFrom="opacity-100 scale-100"
							leaveTo="opacity-0 scale-95"
						>
							<Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
								{/* Header */}
								<div className="mb-4 flex items-center justify-between">
									<Dialog.Title
										as="h3"
										className="font-medium text-gray-900 text-lg leading-6"
									>
										Agendar Serviço
									</Dialog.Title>
									<button
										type="button"
										onClick={onClose}
										className="rounded-full p-1 text-gray-400 hover:text-gray-600"
									>
										<X className="h-6 w-6" />
									</button>
								</div>

								{/* Service Info */}
								<div className="mb-6 rounded-lg bg-gray-50 p-4">
									<h4 className="mb-1 font-medium text-gray-900">
										{service.title}
									</h4>
									<p className="mb-2 text-gray-600 text-sm">
										com {service.provider.name || "Professional"}
									</p>
									<div className="flex items-center justify-between">
										<span className="text-gray-600 text-sm">
											{service.priceType === "hourly"
												? "Por hora"
												: "Preço fixo"}
										</span>
										<PriceDisplay
											amount={service.price}
											type={service.priceType}
											className="font-semibold text-indigo-600"
										/>
									</div>
								</div>

								<form onSubmit={handleSubmit} className="space-y-4">
									{/* Date */}
									<div>
										<label
											htmlFor="booking-date"
											className="mb-1 block font-medium text-gray-700 text-sm"
										>
											Data
										</label>
										<div className="relative">
											<input
												type="date"
												id="booking-date"
												value={bookingDate}
												onChange={(e) => setBookingDate(e.target.value)}
												min={today}
												className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:ring-indigo-500"
												required
											/>
											<Calendar className="absolute top-2.5 right-3 h-5 w-5 text-gray-400" />
										</div>
									</div>

									{/* Time */}
									<div className="grid grid-cols-2 gap-4">
										<div>
											<label
												htmlFor="booking-time"
												className="mb-1 block font-medium text-gray-700 text-sm"
											>
												Horário de início
											</label>
											<div className="relative">
												<input
													type="time"
													id="booking-time"
													value={bookingTime}
													onChange={(e) => setBookingTime(e.target.value)}
													className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:ring-indigo-500"
													required
												/>
												<Clock className="absolute top-2.5 right-3 h-5 w-5 text-gray-400" />
											</div>
										</div>

										{service.priceType === "hourly" && (
											<div>
												<label
													htmlFor="end-time"
													className="mb-1 block font-medium text-gray-700 text-sm"
												>
													Horário de término
												</label>
												<div className="relative">
													<input
														type="time"
														id="end-time"
														value={endTime}
														onChange={(e) => setEndTime(e.target.value)}
														className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:ring-indigo-500"
													/>
													<Clock className="absolute top-2.5 right-3 h-5 w-5 text-gray-400" />
												</div>
											</div>
										)}
									</div>

									{/* Address */}
									<div>
										<label
											htmlFor="address"
											className="mb-1 block font-medium text-gray-700 text-sm"
										>
											Endereço do serviço
										</label>
										<input
											type="text"
											id="address"
											value={address}
											onChange={(e) => setAddress(e.target.value)}
											placeholder="Digite o endereço onde o serviço será realizado"
											className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:ring-indigo-500"
										/>
									</div>

									{/* Notes */}
									<div>
										<label
											htmlFor="notes"
											className="mb-1 block font-medium text-gray-700 text-sm"
										>
											Observações (opcional)
										</label>
										<textarea
											id="notes"
											value={notes}
											onChange={(e) => setNotes(e.target.value)}
											rows={3}
											placeholder="Descreva detalhes específicos sobre o serviço..."
											className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:ring-indigo-500"
										/>
									</div>

									{/* Price Summary */}
									<div className="rounded-lg bg-indigo-50 p-4">
										<div className="flex items-center justify-between">
											<span className="font-medium text-gray-900">
												Total estimado:
											</span>
											<PriceDisplay
												amount={calculatePrice()}
												className="font-bold text-indigo-600 text-lg"
											/>
										</div>
										{service.priceType === "hourly" && (
											<p className="mt-1 text-gray-600 text-xs">
												*Preço pode variar com base na duração real do serviço
											</p>
										)}
									</div>

									{/* Actions */}
									<div className="flex space-x-3 pt-4">
										<Button
											type="button"
											onClick={onClose}
											variant="outline"
											className="flex-1"
										>
											Cancelar
										</Button>
										<Button
											type="submit"
											disabled={createBooking.isPending}
											variant="brand"
											className="flex-1"
										>
											{createBooking.isPending ? "Agendando..." : "Agendar"}
										</Button>
									</div>
								</form>
							</Dialog.Panel>
						</Transition.Child>
					</div>
				</div>
			</Dialog>
		</Transition>
	);
}
