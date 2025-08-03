import { type drive_v3, google } from "googleapis";
import { env } from "~/env";

export interface GoogleDriveFile {
	id: string;
	name: string;
	mimeType: string;
	size?: string;
	thumbnailLink?: string;
	webViewLink?: string;
}

interface GoogleDriveServiceOptions {
	accessToken: string;
	refreshToken?: string;
}

export class GoogleDriveService {
	private drive: drive_v3.Drive;
	private auth: InstanceType<typeof google.auth.OAuth2>;

	constructor({ accessToken, refreshToken }: GoogleDriveServiceOptions) {
		this.auth = new google.auth.OAuth2(
			env.AUTH_GOOGLE_ID,
			env.AUTH_GOOGLE_SECRET,
		);

		this.auth.setCredentials({
			access_token: accessToken,
			refresh_token: refreshToken || "",
		});

		this.drive = google.drive({ version: "v3", auth: this.auth });
	}

	/**
	 * Create a dedicated folder for the marketplace platform in user's Drive
	 */
	async ensureMarketplaceFolder(): Promise<string> {
		const folderName = "Savoir Link";

		try {
			// Check if folder already exists
			const existingFolder = await this.findFolderByName(folderName);
			if (existingFolder) {
				return existingFolder.id;
			}

			// Create new folder
			const folderMetadata = {
				name: folderName,
				mimeType: "application/vnd.google-apps.folder",
				description: "Photos uploaded to Savoir Link platform",
			};

			const folder = await this.drive.files.create({
				requestBody: folderMetadata,
				fields: "id,name",
			});

			return folder.data.id || "";
		} catch (error) {
			console.error("Error creating marketplace folder:", error);
			throw new Error("Failed to create marketplace folder in Google Drive");
		}
	}

	/**
	 * Find folder by name in user's Drive
	 */
	private async findFolderByName(
		name: string,
	): Promise<GoogleDriveFile | null> {
		try {
			const response = await this.drive.files.list({
				q: `name='${name}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
				fields: "files(id,name)",
				pageSize: 1,
			});

			const folders = response.data.files;
			if (folders && folders.length > 0) {
				const folder = folders[0];
				return {
					id: folder?.id || "",
					name: folder?.name || "",
					mimeType: "application/vnd.google-apps.folder",
				} as GoogleDriveFile;
			}
			return null;
		} catch (error) {
			console.error("Error finding folder:", error);
			return null;
		}
	}

	/**
	 * Get file metadata from Google Drive
	 */
	async getFileMetadata(fileId: string): Promise<GoogleDriveFile> {
		try {
			const response = await this.drive.files.get({
				fileId,
				fields: "id,name,mimeType,size,thumbnailLink,webViewLink",
			});

			const file = response.data;
			return {
				id: file.id || "",
				name: file.name || "",
				mimeType: file.mimeType || "",
				size: file.size,
				thumbnailLink: file.thumbnailLink,
				webViewLink: file.webViewLink,
			} as GoogleDriveFile;
		} catch (error) {
			console.error("Error getting file metadata:", error);
			throw new Error("Failed to get file metadata from Google Drive");
		}
	}

	/**
	 * Download file content from Google Drive
	 */
	async downloadFile(fileId: string): Promise<Buffer> {
		try {
			const response = await this.drive.files.get(
				{
					fileId,
					alt: "media",
				},
				{ responseType: "stream" },
			);

			// The response data should be a readable stream for files
			const chunks: Buffer[] = [];
			return new Promise<Buffer>((resolve, reject) => {
				response.data.on("data", (chunk: Buffer) => chunks.push(chunk));
				response.data.on("end", () => resolve(Buffer.concat(chunks)));
				response.data.on("error", reject);
			});
		} catch (error) {
			console.error("Error downloading file from Google Drive:", error);
			throw new Error("Failed to download file from Google Drive");
		}
	}

	/**
	 * Copy file from user's Drive to marketplace folder
	 */
	async copyFileToMarketplaceFolder(
		fileId: string,
		newName?: string,
	): Promise<GoogleDriveFile> {
		try {
			const marketplaceFolderId = await this.ensureMarketplaceFolder();
			const originalFile = await this.getFileMetadata(fileId);

			const copyMetadata = {
				name: newName || `marketplace_${originalFile.name}`,
				parents: [marketplaceFolderId],
			};

			const response = await this.drive.files.copy({
				fileId,
				requestBody: copyMetadata,
				fields: "id,name,mimeType,size,thumbnailLink,webViewLink",
			});

			const file = response.data;
			return {
				id: file.id || "",
				name: file.name || "",
				mimeType: file.mimeType || "",
				size: file.size,
				thumbnailLink: file.thumbnailLink,
				webViewLink: file.webViewLink,
			} as GoogleDriveFile;
		} catch (error) {
			console.error("Error copying file to marketplace folder:", error);
			throw new Error("Failed to copy file to marketplace folder");
		}
	}

	/**
	 * Upload file to marketplace folder in user's Drive
	 */
	async uploadFileToMarketplaceFolder(
		fileBuffer: Buffer,
		filename: string,
		mimeType: string,
	): Promise<GoogleDriveFile> {
		try {
			const marketplaceFolderId = await this.ensureMarketplaceFolder();

			const fileMetadata = {
				name: filename,
				parents: [marketplaceFolderId],
			};

			const media = {
				mimeType,
				body: fileBuffer,
			};

			const response = await this.drive.files.create({
				requestBody: fileMetadata,
				media,
				fields: "id,name,mimeType,size,thumbnailLink,webViewLink",
			});

			const file = response.data;
			return {
				id: file.id || "",
				name: file.name || "",
				mimeType: file.mimeType || "",
				size: file.size,
				thumbnailLink: file.thumbnailLink,
				webViewLink: file.webViewLink,
			} as GoogleDriveFile;
		} catch (error) {
			console.error("Error uploading file to marketplace folder:", error);
			throw new Error("Failed to upload file to marketplace folder");
		}
	}

	/**
	 * List image files in user's Drive (for picker)
	 */
	async listImageFiles(
		pageToken?: string,
		pageSize = 50,
	): Promise<{
		files: GoogleDriveFile[];
		nextPageToken?: string;
	}> {
		try {
			const response = await this.drive.files.list({
				q: "mimeType contains 'image/' and trashed=false",
				fields:
					"nextPageToken,files(id,name,mimeType,size,thumbnailLink,webViewLink)",
				pageSize,
				pageToken,
				orderBy: "modifiedTime desc",
			});

			// Filter out files without IDs and map to GoogleDriveFile
			const files: GoogleDriveFile[] = (response.data.files || [])
				.filter((file): file is drive_v3.Schema$File & { id: string } => {
					return file.id != null;
				})
				.map((file) => ({
					id: file.id,
					name: file.name || "",
					mimeType: file.mimeType || "",
					size: file.size || undefined,
					thumbnailLink: file.thumbnailLink || undefined,
					webViewLink: file.webViewLink || undefined,
				}));

			return {
				files,
				nextPageToken: response.data.nextPageToken || undefined,
			};
		} catch (error) {
			console.error("Error listing image files:", error);
			throw new Error("Failed to list image files from Google Drive");
		}
	}

	/**
	 * Delete file from Google Drive
	 */
	async deleteFile(fileId: string): Promise<void> {
		try {
			await this.drive.files.delete({
				fileId,
			});
		} catch (error) {
			console.error("Error deleting file from Google Drive:", error);
			throw new Error("Failed to delete file from Google Drive");
		}
	}

	/**
	 * Get shareable public link for file
	 */
	async makeFilePublic(fileId: string): Promise<string> {
		try {
			// Set permissions to public
			await this.drive.permissions.create({
				fileId,
				requestBody: {
					role: "reader",
					type: "anyone",
				},
			});

			// Get the public link
			const file = await this.drive.files.get({
				fileId,
				fields: "webViewLink,webContentLink",
			});

			// Return direct download link
			return `https://drive.google.com/uc?id=${fileId}`;
		} catch (error) {
			console.error("Error making file public:", error);
			throw new Error("Failed to make file public");
		}
	}
}

/**
 * Create GoogleDriveService instance with user tokens
 */
export function createGoogleDriveService(
	accessToken: string,
	refreshToken?: string,
): GoogleDriveService {
	return new GoogleDriveService({ accessToken, refreshToken });
}

/**
 * Validate if file is an image
 */
export function isImageFile(mimeType: string): boolean {
	return mimeType.startsWith("image/");
}

/**
 * Get supported image MIME types
 */
export function getSupportedImageTypes(): string[] {
	return [
		"image/jpeg",
		"image/jpg",
		"image/png",
		"image/gif",
		"image/webp",
		"image/bmp",
		"image/svg+xml",
	];
}
