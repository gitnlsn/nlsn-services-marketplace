import {
	DeleteObjectCommand,
	GetObjectCommand,
	PutObjectCommand,
	S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { v4 as uuidv4 } from "uuid";
import { env } from "~/env";

// Initialize S3 client
const s3Client = new S3Client({
	region: env.AWS_REGION || "us-east-1",
	credentials: {
		accessKeyId: env.AWS_ACCESS_KEY_ID || "",
		secretAccessKey: env.AWS_SECRET_ACCESS_KEY || "",
	},
});

export interface UploadResult {
	url: string;
	key: string;
	bucket: string;
	size?: number;
	contentType?: string;
}

export interface S3UploadOptions {
	folder?: string;
	filename?: string;
	contentType?: string;
	metadata?: Record<string, string>;
}

/**
 * Upload a file to S3
 */
export async function uploadToS3(
	buffer: Buffer,
	options: S3UploadOptions = {},
): Promise<UploadResult> {
	try {
		const folder = options.folder || "marketplace";
		const filename = options.filename || `${uuidv4()}`;
		const key = `${folder}/${filename}`;

		const command = new PutObjectCommand({
			Bucket: env.AWS_S3_BUCKET_NAME,
			Key: key,
			Body: buffer,
			ContentType: options.contentType || "image/jpeg",
			Metadata: options.metadata,
			ServerSideEncryption: "AES256",
		});

		await s3Client.send(command);

		const url = `https://${env.AWS_S3_BUCKET_NAME}.s3.${env.AWS_REGION}.amazonaws.com/${key}`;

		return {
			url,
			key,
			bucket: env.AWS_S3_BUCKET_NAME || "",
			size: buffer.length,
			contentType: options.contentType,
		};
	} catch (error) {
		console.error("S3 upload error:", error);
		throw new Error("Failed to upload file to S3");
	}
}

/**
 * Delete a file from S3
 */
export async function deleteFromS3(key: string): Promise<void> {
	try {
		const command = new DeleteObjectCommand({
			Bucket: env.AWS_S3_BUCKET_NAME,
			Key: key,
		});

		await s3Client.send(command);
	} catch (error) {
		console.error("S3 delete error:", error);
		throw new Error("Failed to delete file from S3");
	}
}

/**
 * Generate a presigned URL for direct upload from client
 */
export async function generatePresignedUploadUrl(
	options: S3UploadOptions = {},
): Promise<{
	url: string;
	key: string;
	fields: Record<string, string>;
}> {
	try {
		const folder = options.folder || "marketplace";
		const filename = options.filename || `${uuidv4()}`;
		const key = `${folder}/${filename}`;

		const command = new PutObjectCommand({
			Bucket: env.AWS_S3_BUCKET_NAME,
			Key: key,
			ContentType: options.contentType || "image/jpeg",
			Metadata: options.metadata,
			ServerSideEncryption: "AES256",
		});

		// URL expires in 5 minutes
		const url = await getSignedUrl(s3Client, command, { expiresIn: 300 });

		return {
			url,
			key,
			fields: {
				key,
				bucket: env.AWS_S3_BUCKET_NAME || "",
			},
		};
	} catch (error) {
		console.error("S3 presigned URL error:", error);
		throw new Error("Failed to generate presigned URL");
	}
}

/**
 * Generate a presigned URL for downloading/viewing a file
 */
export async function generatePresignedDownloadUrl(
	key: string,
	expiresIn = 3600, // 1 hour default
): Promise<string> {
	try {
		const command = new GetObjectCommand({
			Bucket: env.AWS_S3_BUCKET_NAME,
			Key: key,
		});

		return await getSignedUrl(s3Client, command, { expiresIn });
	} catch (error) {
		console.error("S3 presigned download URL error:", error);
		throw new Error("Failed to generate presigned download URL");
	}
}

/**
 * Get public URL for a file (assumes bucket has public read access)
 */
export function getPublicUrl(key: string): string {
	return `https://${env.AWS_S3_BUCKET_NAME}.s3.${env.AWS_REGION}.amazonaws.com/${key}`;
}

/**
 * Upload multiple files to S3
 */
export async function uploadMultipleToS3(
	files: Array<{
		buffer: Buffer;
		options?: S3UploadOptions;
	}>,
): Promise<UploadResult[]> {
	try {
		const uploadPromises = files.map((file) =>
			uploadToS3(file.buffer, file.options),
		);

		return await Promise.all(uploadPromises);
	} catch (error) {
		console.error("S3 multiple upload error:", error);
		throw new Error("Failed to upload multiple files to S3");
	}
}

/**
 * Check if S3 is properly configured
 */
export function isS3Configured(): boolean {
	return !!(
		env.AWS_ACCESS_KEY_ID &&
		env.AWS_SECRET_ACCESS_KEY &&
		env.AWS_S3_BUCKET_NAME &&
		env.AWS_REGION
	);
}
