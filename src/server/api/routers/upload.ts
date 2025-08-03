import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import {
	deleteImage,
	generateSignedUploadUrl,
	getOptimizedImageUrl,
	uploadImage,
} from "~/server/services/storage-service";

export const uploadRouter = createTRPCRouter({
	/**
	 * Generate signed upload parameters for client-side upload
	 */
	getSignedUploadUrl: protectedProcedure
		.input(
			z.object({
				folder: z.string().optional().default("marketplace"),
			}),
		)
		.mutation(async ({ input }) => {
			return generateSignedUploadUrl(input.folder);
		}),

	/**
	 * Upload image from base64 data (for small images)
	 */
	uploadImage: protectedProcedure
		.input(
			z.object({
				base64: z.string(),
				filename: z.string().optional(),
				folder: z.string().optional().default("marketplace"),
			}),
		)
		.mutation(async ({ input }) => {
			// Convert base64 to buffer
			const base64Data = input.base64.replace(/^data:image\/\w+;base64,/, "");
			const buffer = Buffer.from(base64Data, "base64");

			const result = await uploadImage(buffer, {
				folder: input.folder,
				filename: input.filename,
			});

			return result;
		}),

	/**
	 * Delete an uploaded image
	 */
	deleteImage: protectedProcedure
		.input(
			z.object({
				publicId: z.string(),
			}),
		)
		.mutation(async ({ input }) => {
			await deleteImage(input.publicId);
			return { success: true };
		}),

	/**
	 * Get optimized image URL
	 */
	getOptimizedImageUrl: protectedProcedure
		.input(
			z.object({
				publicId: z.string(),
				width: z.number().optional(),
				height: z.number().optional(),
				crop: z.string().optional(),
				quality: z.string().optional(),
				format: z.string().optional(),
			}),
		)
		.query(async ({ input }) => {
			const { publicId, ...options } = input;
			return {
				url: getOptimizedImageUrl(publicId, options),
			};
		}),
});
