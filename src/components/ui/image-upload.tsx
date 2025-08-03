"use client";

import { Image as ImageIcon, Loader2, Upload, X } from "lucide-react";
import Image from "next/image";
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
import { Button } from "./button";

interface ImageUploadProps {
	value?: string | string[];
	onChange: (value: string | string[]) => void;
	onRemove?: (value: string) => void;
	disabled?: boolean;
	multiple?: boolean;
	maxFiles?: number;
	maxSize?: number; // in MB
	className?: string;
}

export function ImageUpload({
	value,
	onChange,
	onRemove,
	disabled = false,
	multiple = false,
	maxFiles = 5,
	maxSize = 5, // 5MB default
	className,
}: ImageUploadProps) {
	const [isUploading, setIsUploading] = useState(false);
	const [uploadProgress, setUploadProgress] = useState(0);

	const images = Array.isArray(value) ? value : value ? [value] : [];

	// Get upload mutation
	const uploadImageMutation = api.upload.uploadImage.useMutation();
	const deleteImageMutation = api.upload.deleteImage.useMutation();

	const onDrop = useCallback(
		async (acceptedFiles: File[]) => {
			if (disabled || isUploading) return;

			setIsUploading(true);
			setUploadProgress(0);

			try {
				const uploadPromises = acceptedFiles.map(async (file, index) => {
					// Convert file to base64
					const base64 = await fileToBase64(file);

					// Update progress for this file
					const progressStep = 100 / acceptedFiles.length;
					const baseProgress = index * progressStep;

					setUploadProgress(baseProgress + progressStep * 0.5);

					// Upload to Cloudinary via tRPC
					const result = await uploadImageMutation.mutateAsync({
						base64,
						filename: file.name.split(".")[0],
						folder: "marketplace",
					});

					setUploadProgress(baseProgress + progressStep);

					return result.url;
				});

				const uploadedUrls = await Promise.all(uploadPromises);

				if (multiple) {
					const newImages = [...images, ...uploadedUrls].slice(0, maxFiles);
					onChange(newImages);
				} else {
					onChange(uploadedUrls[0] || "");
				}
			} catch (error) {
				console.error("Upload error:", error);
				alert("Erro ao fazer upload da imagem");
			} finally {
				setIsUploading(false);
				setUploadProgress(0);
			}
		},
		[
			disabled,
			isUploading,
			images,
			multiple,
			maxFiles,
			onChange,
			uploadImageMutation,
		],
	);

	const { getRootProps, getInputProps, isDragActive } = useDropzone({
		onDrop,
		accept: {
			"image/*": [".png", ".jpg", ".jpeg", ".gif", ".webp"],
		},
		maxFiles: multiple ? maxFiles - images.length : 1,
		maxSize: maxSize * 1024 * 1024, // Convert MB to bytes
		disabled: disabled || isUploading || (!multiple && images.length > 0),
	});

	const handleRemove = async (url: string) => {
		if (disabled || isUploading) return;

		try {
			// Extract public ID from Cloudinary URL if it's a Cloudinary image
			if (url.includes("cloudinary.com")) {
				const publicIdMatch = url.match(/\/([^\/]+)\.[^.]+$/);
				if (publicIdMatch?.[1]) {
					const publicId = publicIdMatch[1];
					await deleteImageMutation.mutateAsync({ publicId });
				}
			}
		} catch (error) {
			console.error("Error deleting image:", error);
			// Continue with removal from UI even if cloud deletion fails
		}

		if (multiple) {
			const newImages = images.filter((img) => img !== url);
			onChange(newImages);
		} else {
			onChange("");
		}
		onRemove?.(url);
	};

	return (
		<div className={cn("space-y-4", className)}>
			{/* Upload Area */}
			{(multiple || images.length === 0) && (
				<div
					{...getRootProps()}
					className={cn(
						"relative rounded-lg border-2 border-dashed p-6 text-center transition-colors",
						isDragActive
							? "border-primary bg-primary/5"
							: "border-gray-300 hover:border-gray-400",
						disabled || isUploading
							? "cursor-not-allowed opacity-50"
							: "cursor-pointer",
						className,
					)}
				>
					<input {...getInputProps()} />

					{isUploading ? (
						<div className="space-y-2">
							<Loader2 className="mx-auto h-10 w-10 animate-spin text-gray-400" />
							<p className="text-gray-600 text-sm">
								Fazendo upload... {uploadProgress}%
							</p>
							<div className="mx-auto max-w-xs">
								<div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
									<div
										className="h-full bg-primary transition-all duration-300"
										style={{ width: `${uploadProgress}%` }}
									/>
								</div>
							</div>
						</div>
					) : (
						<>
							<Upload className="mx-auto h-10 w-10 text-gray-400" />
							<p className="mt-2 text-gray-600 text-sm">
								{isDragActive
									? "Solte as imagens aqui..."
									: "Arraste imagens ou clique para selecionar"}
							</p>
							<p className="text-gray-500 text-xs">
								PNG, JPG, GIF até {maxSize}MB
								{multiple && ` (máximo ${maxFiles} imagens)`}
							</p>
						</>
					)}
				</div>
			)}

			{/* Image Preview Grid */}
			{images.length > 0 && (
				<div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
					{images.map((url, index) => (
						<div key={url} className="group relative">
							<div className="relative aspect-square overflow-hidden rounded-lg border">
								<Image
									src={url}
									alt={`Upload ${index + 1}`}
									fill
									className="object-cover"
								/>
							</div>
							{!disabled && !isUploading && (
								<button
									type="button"
									onClick={() => handleRemove(url)}
									className="-top-2 -right-2 absolute rounded-full bg-red-500 p-1 text-white opacity-0 shadow-sm transition-opacity group-hover:opacity-100"
								>
									<X className="h-4 w-4" />
								</button>
							)}
						</div>
					))}
				</div>
			)}

			{/* Helper Text */}
			{multiple && images.length > 0 && (
				<p className="text-gray-500 text-sm">
					{images.length} de {maxFiles} imagens
				</p>
			)}
		</div>
	);
}

// Helper function to convert file to base64
function fileToBase64(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.readAsDataURL(file);
		reader.onload = () => resolve(reader.result as string);
		reader.onerror = (error) => reject(error);
	});
}
