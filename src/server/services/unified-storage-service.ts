import { env } from "~/env";
import * as s3Service from "./s3-storage-service";
import * as cloudinaryService from "./storage-service";

export type StorageProvider = "cloudinary" | "s3";

export interface UnifiedUploadResult {
	url: string;
	id: string; // publicId for Cloudinary, key for S3
	provider: StorageProvider;
	metadata?: {
		width?: number;
		height?: number;
		size?: number;
		format?: string;
	};
}

export interface UnifiedUploadOptions {
	folder?: string;
	filename?: string;
	contentType?: string;
	transformation?: object;
	metadata?: Record<string, string>;
}

/**
 * Get the configured storage provider
 */
function getStorageProvider(): StorageProvider {
	// Check if S3 is configured and preferred
	if (env.STORAGE_PROVIDER === "s3" && s3Service.isS3Configured()) {
		return "s3";
	}

	// Default to Cloudinary if configured
	if (
		env.CLOUDINARY_CLOUD_NAME &&
		env.CLOUDINARY_API_KEY &&
		env.CLOUDINARY_API_SECRET
	) {
		return "cloudinary";
	}

	// If S3 is configured but not preferred, use it
	if (s3Service.isS3Configured()) {
		return "s3";
	}

	throw new Error(
		"No storage provider configured. Please configure either Cloudinary or AWS S3.",
	);
}

/**
 * Upload a file using the configured storage provider
 */
export async function uploadFile(
	buffer: Buffer,
	options: UnifiedUploadOptions = {},
): Promise<UnifiedUploadResult> {
	const provider = getStorageProvider();

	if (provider === "s3") {
		const result = await s3Service.uploadToS3(buffer, {
			folder: options.folder,
			filename: options.filename,
			contentType: options.contentType,
			metadata: options.metadata,
		});

		return {
			url: result.url,
			id: result.key,
			provider: "s3",
			metadata: {
				size: result.size,
			},
		};
	}
	const result = await cloudinaryService.uploadImage(buffer, {
		folder: options.folder,
		filename: options.filename,
		transformation: options.transformation,
	});

	return {
		url: result.url,
		id: result.publicId,
		provider: "cloudinary",
		metadata: {
			width: result.width,
			height: result.height,
			size: result.bytes,
			format: result.format,
		},
	};
}

/**
 * Delete a file from storage
 */
export async function deleteFile(
	id: string,
	provider?: StorageProvider,
): Promise<void> {
	const activeProvider = provider || getStorageProvider();

	if (activeProvider === "s3") {
		await s3Service.deleteFromS3(id);
	} else {
		await cloudinaryService.deleteImage(id);
	}
}

/**
 * Generate a signed upload URL for client-side uploads
 */
export async function generateSignedUploadUrl(
	options: UnifiedUploadOptions = {},
): Promise<{
	url: string;
	provider: StorageProvider;
	fields: Record<string, string>;
}> {
	const provider = getStorageProvider();

	if (provider === "s3") {
		const result = await s3Service.generatePresignedUploadUrl({
			folder: options.folder,
			filename: options.filename,
			contentType: options.contentType,
			metadata: options.metadata,
		});

		return {
			url: result.url,
			provider: "s3",
			fields: result.fields,
		};
	}
	const result = cloudinaryService.generateSignedUploadUrl(options.folder);

	return {
		url: result.url,
		provider: "cloudinary",
		fields: {
			signature: result.signature,
			timestamp: result.timestamp.toString(),
			api_key: result.apiKey,
			cloud_name: result.cloudName,
			folder: options.folder || "",
		},
	};
}

/**
 * Get optimized image URL
 */
export function getOptimizedImageUrl(
	id: string,
	options: {
		width?: number;
		height?: number;
		quality?: string;
		format?: string;
		provider?: StorageProvider;
	} = {},
): string {
	const provider = options.provider || getStorageProvider();

	if (provider === "s3") {
		// For S3, we return the direct URL - optimization would be handled by CloudFront or similar
		return s3Service.getPublicUrl(id);
	}
	return cloudinaryService.getOptimizedImageUrl(id, {
		width: options.width,
		height: options.height,
		quality: options.quality,
		format: options.format,
	});
}

/**
 * Upload multiple files
 */
export async function uploadMultipleFiles(
	files: Array<{
		buffer: Buffer;
		options?: UnifiedUploadOptions;
	}>,
): Promise<UnifiedUploadResult[]> {
	const uploadPromises = files.map((file) =>
		uploadFile(file.buffer, file.options),
	);

	return await Promise.all(uploadPromises);
}

/**
 * Get storage provider configuration status
 */
export function getStorageStatus(): {
	provider: StorageProvider | null;
	configured: boolean;
	providers: {
		cloudinary: boolean;
		s3: boolean;
	};
} {
	const cloudinaryConfigured = !!(
		env.CLOUDINARY_CLOUD_NAME &&
		env.CLOUDINARY_API_KEY &&
		env.CLOUDINARY_API_SECRET
	);

	const s3Configured = s3Service.isS3Configured();

	let provider: StorageProvider | null = null;
	let configured = false;

	try {
		provider = getStorageProvider();
		configured = true;
	} catch {
		// No provider configured
	}

	return {
		provider,
		configured,
		providers: {
			cloudinary: cloudinaryConfigured,
			s3: s3Configured,
		},
	};
}
