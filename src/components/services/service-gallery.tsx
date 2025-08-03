"use client";

import {
	ChevronLeft,
	ChevronRight,
	Download,
	Share2,
	X,
	ZoomIn,
} from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { Button } from "~/components/ui/button";

interface ServiceGalleryProps {
	images: Array<{ url: string; [key: string]: unknown }>;
	serviceName: string;
}

export function ServiceGallery({ images, serviceName }: ServiceGalleryProps) {
	const [currentIndex, setCurrentIndex] = useState(0);
	const [isLightboxOpen, setIsLightboxOpen] = useState(false);
	const [lightboxIndex, setLightboxIndex] = useState(0);

	// Handle keyboard navigation
	useEffect(() => {
		const handleKeyPress = (e: KeyboardEvent) => {
			if (!isLightboxOpen) return;

			switch (e.key) {
				case "ArrowLeft":
					e.preventDefault();
					prevImage();
					break;
				case "ArrowRight":
					e.preventDefault();
					nextImage();
					break;
				case "Escape":
					e.preventDefault();
					setIsLightboxOpen(false);
					break;
			}
		};

		window.addEventListener("keydown", handleKeyPress);
		return () => window.removeEventListener("keydown", handleKeyPress);
	}, [isLightboxOpen]);

	const nextImage = useCallback(() => {
		if (isLightboxOpen) {
			setLightboxIndex((prev) => (prev + 1) % images.length);
		} else {
			setCurrentIndex((prev) => (prev + 1) % images.length);
		}
	}, [images.length, isLightboxOpen]);

	const prevImage = useCallback(() => {
		if (isLightboxOpen) {
			setLightboxIndex((prev) => (prev - 1 + images.length) % images.length);
		} else {
			setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
		}
	}, [images.length, isLightboxOpen]);

	const openLightbox = (index: number) => {
		setLightboxIndex(index);
		setIsLightboxOpen(true);
	};

	const handleShare = async () => {
		const currentImage = images[isLightboxOpen ? lightboxIndex : currentIndex];
		if (navigator.share && currentImage) {
			try {
				await navigator.share({
					title: serviceName,
					text: `Confira este serviço: ${serviceName}`,
					url: window.location.href,
				});
			} catch (error) {
				console.log("Error sharing:", error);
			}
		} else {
			// Fallback: copy URL to clipboard
			await navigator.clipboard.writeText(window.location.href);
			alert("Link copiado para a área de transferência!");
		}
	};

	const handleDownload = () => {
		const currentImage = images[isLightboxOpen ? lightboxIndex : currentIndex];
		if (currentImage) {
			const link = document.createElement("a");
			link.href = currentImage.url;
			link.download = `${serviceName}-${(isLightboxOpen ? lightboxIndex : currentIndex) + 1}.jpg`;
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
		}
	};

	if (!images || images.length === 0) {
		return (
			<div className="mb-8">
				<div className="flex h-96 items-center justify-center rounded-lg bg-gray-200">
					<span className="text-gray-500">Nenhuma imagem disponível</span>
				</div>
			</div>
		);
	}

	return (
		<>
			{/* Main Gallery */}
			<div className="mb-8">
				{/* Main Image Display */}
				<div className="relative mb-4 h-96 overflow-hidden rounded-lg bg-gray-100">
					<Image
						src={images[currentIndex]?.url || "/placeholder.jpg"}
						alt={`${serviceName} - Imagem ${currentIndex + 1}`}
						fill
						className="object-cover transition-transform duration-300 hover:scale-105"
					/>

					{/* Navigation Arrows */}
					{images.length > 1 && (
						<>
							<Button
								variant="outline"
								size="icon"
								className="-translate-y-1/2 absolute top-1/2 left-4 rounded-full bg-white/90 backdrop-blur-sm hover:bg-white"
								onClick={prevImage}
							>
								<ChevronLeft className="h-4 w-4" />
							</Button>
							<Button
								variant="outline"
								size="icon"
								className="-translate-y-1/2 absolute top-1/2 right-4 rounded-full bg-white/90 backdrop-blur-sm hover:bg-white"
								onClick={nextImage}
							>
								<ChevronRight className="h-4 w-4" />
							</Button>
						</>
					)}

					{/* Action Buttons */}
					<div className="absolute top-4 right-4 flex gap-2">
						<Button
							variant="outline"
							size="icon"
							className="rounded-full bg-white/90 backdrop-blur-sm hover:bg-white"
							onClick={() => openLightbox(currentIndex)}
						>
							<ZoomIn className="h-4 w-4" />
						</Button>
						<Button
							variant="outline"
							size="icon"
							className="rounded-full bg-white/90 backdrop-blur-sm hover:bg-white"
							onClick={handleShare}
						>
							<Share2 className="h-4 w-4" />
						</Button>
						<Button
							variant="outline"
							size="icon"
							className="rounded-full bg-white/90 backdrop-blur-sm hover:bg-white"
							onClick={handleDownload}
						>
							<Download className="h-4 w-4" />
						</Button>
					</div>

					{/* Image Counter */}
					{images.length > 1 && (
						<div className="absolute bottom-4 left-4 rounded-full bg-black/70 px-3 py-1 text-sm text-white backdrop-blur-sm">
							{currentIndex + 1} de {images.length}
						</div>
					)}
				</div>

				{/* Thumbnail Strip */}
				{images.length > 1 && (
					<div className="flex gap-2 overflow-x-auto pb-2">
						{images.map((image, index) => (
							<button
								key={image.url}
								type="button"
								className={`relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg border-2 transition-all ${
									index === currentIndex
										? "border-indigo-500 ring-2 ring-indigo-200"
										: "border-gray-200 hover:border-gray-300"
								}`}
								onClick={() => setCurrentIndex(index)}
							>
								<Image
									src={image.url}
									alt={`Thumbnail ${index + 1}`}
									fill
									className="object-cover"
								/>
							</button>
						))}
					</div>
				)}
			</div>

			{/* Lightbox Modal */}
			{isLightboxOpen && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm">
					<div className="relative h-full w-full">
						{/* Close Button */}
						<Button
							variant="outline"
							size="icon"
							className="absolute top-4 right-4 z-10 rounded-full bg-white/10 text-white backdrop-blur-sm hover:bg-white/20"
							onClick={() => setIsLightboxOpen(false)}
						>
							<X className="h-4 w-4" />
						</Button>

						{/* Navigation Arrows */}
						{images.length > 1 && (
							<>
								<Button
									variant="outline"
									size="icon"
									className="-translate-y-1/2 absolute top-1/2 left-4 z-10 rounded-full bg-white/10 text-white backdrop-blur-sm hover:bg-white/20"
									onClick={prevImage}
								>
									<ChevronLeft className="h-4 w-4" />
								</Button>
								<Button
									variant="outline"
									size="icon"
									className="-translate-y-1/2 absolute top-1/2 right-4 z-10 rounded-full bg-white/10 text-white backdrop-blur-sm hover:bg-white/20"
									onClick={nextImage}
								>
									<ChevronRight className="h-4 w-4" />
								</Button>
							</>
						)}

						{/* Action Buttons */}
						<div className="absolute right-4 bottom-4 z-10 flex gap-2">
							<Button
								variant="outline"
								size="icon"
								className="rounded-full bg-white/10 text-white backdrop-blur-sm hover:bg-white/20"
								onClick={handleShare}
							>
								<Share2 className="h-4 w-4" />
							</Button>
							<Button
								variant="outline"
								size="icon"
								className="rounded-full bg-white/10 text-white backdrop-blur-sm hover:bg-white/20"
								onClick={handleDownload}
							>
								<Download className="h-4 w-4" />
							</Button>
						</div>

						{/* Image Counter */}
						{images.length > 1 && (
							<div className="absolute bottom-4 left-4 z-10 rounded-full bg-white/10 px-3 py-1 text-white backdrop-blur-sm">
								{lightboxIndex + 1} de {images.length}
							</div>
						)}

						{/* Main Lightbox Image */}
						<div className="flex h-full w-full items-center justify-center p-8">
							<div className="relative max-h-full max-w-full">
								<Image
									src={images[lightboxIndex]?.url || "/placeholder.jpg"}
									alt={`${serviceName} - Imagem ${lightboxIndex + 1}`}
									width={1200}
									height={800}
									className="max-h-full max-w-full object-contain"
								/>
							</div>
						</div>

						{/* Thumbnail Strip in Lightbox */}
						{images.length > 1 && (
							<div className="-translate-x-1/2 absolute bottom-8 left-1/2 z-10 flex gap-2 rounded-lg bg-black/50 p-2">
								{images.map((image, index) => (
									<button
										key={image.url}
										type="button"
										className={`relative h-12 w-12 flex-shrink-0 overflow-hidden rounded border-2 transition-all ${
											index === lightboxIndex
												? "border-white"
												: "border-transparent opacity-60 hover:opacity-100"
										}`}
										onClick={() => setLightboxIndex(index)}
									>
										<Image
											src={image.url}
											alt={`Thumbnail ${index + 1}`}
											fill
											className="object-cover"
										/>
									</button>
								))}
							</div>
						)}
					</div>
				</div>
			)}
		</>
	);
}
