import { v2 as cloudinary } from "cloudinary";
import { env } from "~/env";

// Configure Cloudinary
cloudinary.config({
	cloud_name: env.CLOUDINARY_CLOUD_NAME,
	api_key: env.CLOUDINARY_API_KEY,
	api_secret: env.CLOUDINARY_API_SECRET,
});

export interface UploadResult {
	url: string;
	publicId: string;
	width?: number;
	height?: number;
	format?: string;
	bytes?: number;
}

/**
 * Upload an image to Cloudinary
 */
export async function uploadImage(
	buffer: Buffer,
	options: {
		folder?: string;
		filename?: string;
		transformation?: object;
	} = {},
): Promise<UploadResult> {
	try {
		return new Promise((resolve, reject) => {
			const uploadStream = cloudinary.uploader.upload_stream(
				{
					folder: options.folder || "marketplace",
					public_id: options.filename,
					transformation: options.transformation || {
						quality: "auto",
						fetch_format: "auto",
					},
					resource_type: "image",
				},
				(error, result) => {
					if (error) {
						reject(error);
					} else if (result) {
						resolve({
							url: result.secure_url,
							publicId: result.public_id,
							width: result.width,
							height: result.height,
							format: result.format,
							bytes: result.bytes,
						});
					} else {
						reject(new Error("Upload failed: No result returned"));
					}
				},
			);

			uploadStream.end(buffer);
		});
	} catch (error) {
		console.error("Upload error:", error);
		throw new Error("Failed to upload image");
	}
}

/**
 * Delete an image from Cloudinary
 */
export async function deleteImage(publicId: string): Promise<void> {
	try {
		await cloudinary.uploader.destroy(publicId);
	} catch (error) {
		console.error("Delete error:", error);
		throw new Error("Failed to delete image");
	}
}

/**
 * Generate a signed upload URL for client-side uploads
 */
export function generateSignedUploadUrl(folder = "marketplace"): {
	url: string;
	signature: string;
	timestamp: number;
	apiKey: string;
	cloudName: string;
} {
	const timestamp = Math.round(new Date().getTime() / 1000);
	const params = {
		timestamp,
		folder,
		transformation: "q_auto,f_auto",
	};

	const signature = cloudinary.utils.api_sign_request(
		params,
		env.CLOUDINARY_API_SECRET,
	);

	return {
		url: `https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/image/upload`,
		signature,
		timestamp,
		apiKey: env.CLOUDINARY_API_KEY,
		cloudName: env.CLOUDINARY_CLOUD_NAME,
	};
}

/**
 * Get optimized image URL with transformations
 */
export function getOptimizedImageUrl(
	publicId: string,
	options: {
		width?: number;
		height?: number;
		crop?: string;
		quality?: string;
		format?: string;
	} = {},
): string {
	return cloudinary.url(publicId, {
		width: options.width,
		height: options.height,
		crop: options.crop || "fill",
		quality: options.quality || "auto",
		fetch_format: options.format || "auto",
		secure: true,
	});
}
