"use client";

import { Dialog, Transition } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { Fragment } from "react";
import { ReviewForm } from "./review-form";

interface ReviewModalProps {
	isOpen: boolean;
	onClose: () => void;
	serviceId: string;
	bookingId?: string;
	serviceName: string;
}

export function ReviewModal({
	isOpen,
	onClose,
	serviceId,
	bookingId,
	serviceName,
}: ReviewModalProps) {
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
										Avaliar {serviceName}
									</Dialog.Title>
									<button
										type="button"
										onClick={onClose}
										className="rounded-full p-1 text-gray-400 hover:text-gray-600"
									>
										<XMarkIcon className="h-6 w-6" />
									</button>
								</div>

								{/* Review Form */}
								<ReviewForm
									serviceId={serviceId}
									bookingId={bookingId}
									onSuccess={onClose}
									onCancel={onClose}
								/>
							</Dialog.Panel>
						</Transition.Child>
					</div>
				</div>
			</Dialog>
		</Transition>
	);
}
