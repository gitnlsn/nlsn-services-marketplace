"use client";

import { Cloud, Loader2, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "./button";

interface GoogleDriveFile {
	id: string;
	name: string;
	mimeType: string;
	thumbnailLink?: string;
	downloadUrl?: string;
}

interface GoogleDrivePickerProps {
	onFilesSelected: (files: GoogleDriveFile[]) => void;
	multiple?: boolean;
	maxFiles?: number;
	disabled?: boolean;
	className?: string;
}

// Google API types
interface GoogleAPIClient {
	load: (api: string, callback: () => void) => void;
	auth2: {
		getAuthInstance: () => {
			isSignedIn: {
				get: () => boolean;
			};
		};
	};
}

interface GooglePickerDocsView {
	setSelectFolderEnabled: (enabled: boolean) => GooglePickerDocsView;
	setIncludeFolders: (enabled: boolean) => GooglePickerDocsView;
}

interface GooglePickerBuilder {
	addView: (view: GooglePickerDocsView) => GooglePickerBuilder;
	setOAuthToken: (token: string) => GooglePickerBuilder;
	setCallback: (
		callback: (data: GooglePickerData) => void,
	) => GooglePickerBuilder;
	setTitle: (title: string) => GooglePickerBuilder;
	setFeature: (feature: string) => GooglePickerBuilder;
	setSize: (width: number, height: number) => GooglePickerBuilder;
	build: () => {
		setVisible: (visible: boolean) => void;
	};
}

interface GooglePicker {
	PickerBuilder: new () => GooglePickerBuilder;
	DocsView: new (viewId?: string) => GooglePickerDocsView;
	ViewId: {
		DOCS: string;
		DOCS_IMAGES: string;
	};
	Action: {
		PICKED: string;
		CANCEL: string;
	};
	Response: {
		ACTION: string;
		DOCUMENTS: string;
	};
	Feature: {
		NAV_HIDDEN: string;
		MULTISELECT_ENABLED: string;
	};
}

interface GooglePickerFile {
	id: string;
	name: string;
	mimeType: string;
	url: string;
	downloadUrl?: string;
	thumbnails?: {
		[key: string]: string;
	};
}

interface GooglePickerData {
	[key: string]: unknown;
}

declare global {
	interface Window {
		gapi: GoogleAPIClient;
		google: {
			picker: GooglePicker;
		};
	}
}

export function GoogleDrivePicker({
	onFilesSelected,
	multiple = false,
	maxFiles = 5,
	disabled = false,
	className,
}: GoogleDrivePickerProps) {
	const [isLoading, setIsLoading] = useState(false);
	const [isApiLoaded, setIsApiLoaded] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Load Google APIs
	useEffect(() => {
		const loadGoogleAPIs = async () => {
			try {
				// Load Google API
				if (!window.gapi) {
					const script = document.createElement("script");
					script.src = "https://apis.google.com/js/api.js";
					script.onload = () => {
						window.gapi.load("auth2:picker", () => {
							setIsApiLoaded(true);
						});
					};
					document.head.appendChild(script);
				} else {
					window.gapi.load("auth2:picker", () => {
						setIsApiLoaded(true);
					});
				}
			} catch (error) {
				console.error("Error loading Google APIs:", error);
				setError("Failed to load Google APIs");
			}
		};

		loadGoogleAPIs();
	}, []);

	const openPicker = useCallback(async () => {
		if (!isApiLoaded || disabled) return;

		setIsLoading(true);
		setError(null);

		try {
			// Get access token from current session
			const response = await fetch("/api/auth/session");
			if (!response.ok) {
				throw new Error("Failed to get session");
			}

			const session = await response.json();
			if (!session?.accessToken) {
				throw new Error(
					"No Google Drive access token available. Please sign in again.",
				);
			}

			// Create and open picker
			const picker = new window.google.picker.PickerBuilder()
				.addView(
					new window.google.picker.DocsView(
						window.google.picker.ViewId.DOCS_IMAGES,
					)
						.setSelectFolderEnabled(false)
						.setIncludeFolders(false),
				)
				.setOAuthToken(session.accessToken)
				.setCallback(pickerCallback)
				.setTitle("Select Images from Google Drive")
				.setSize(800, 600);

			if (multiple) {
				picker.setFeature(window.google.picker.Feature.MULTISELECT_ENABLED);
			}

			picker.build().setVisible(true);
		} catch (error) {
			console.error("Error opening Google Drive picker:", error);
			setError("Failed to open Google Drive picker");
			setIsLoading(false);
		}
	}, [isApiLoaded, disabled, multiple]);

	const pickerCallback = useCallback(
		(data: GooglePickerData) => {
			setIsLoading(false);

			if (
				data[window.google.picker.Response.ACTION] ===
				window.google.picker.Action.PICKED
			) {
				const files = data[window.google.picker.Response.DOCUMENTS];

				// Filter only image files
				const imageFiles = (files as GooglePickerFile[]).filter((file) =>
					file.mimeType?.startsWith("image/"),
				);

				// Limit files if maxFiles is set
				const selectedFiles = multiple
					? imageFiles.slice(0, maxFiles)
					: imageFiles.slice(0, 1);

				// Map to our format
				const mappedFiles: GoogleDriveFile[] = selectedFiles.map((file) => ({
					id: file.id,
					name: file.name,
					mimeType: file.mimeType,
					thumbnailLink: file.thumbnails
						? Object.values(file.thumbnails)[0]
						: undefined,
					downloadUrl: file.downloadUrl,
				}));

				onFilesSelected(mappedFiles);
			} else if (
				data[window.google.picker.Response.ACTION] ===
				window.google.picker.Action.CANCEL
			) {
				// User cancelled
				console.log("User cancelled Google Drive picker");
			}
		},
		[onFilesSelected, multiple, maxFiles],
	);

	if (error) {
		return (
			<div className="rounded-lg border border-red-200 bg-red-50 p-4">
				<div className="flex items-center">
					<X className="h-5 w-5 text-red-400" />
					<p className="ml-2 text-red-700 text-sm">{error}</p>
				</div>
				<Button
					variant="outline"
					size="sm"
					onClick={() => setError(null)}
					className="mt-2"
				>
					Try Again
				</Button>
			</div>
		);
	}

	return (
		<Button
			variant="outline"
			onClick={openPicker}
			disabled={disabled || isLoading || !isApiLoaded}
			className={className}
		>
			{isLoading ? (
				<Loader2 className="mr-2 h-4 w-4 animate-spin" />
			) : (
				<Cloud className="mr-2 h-4 w-4" />
			)}
			{isLoading
				? "Opening Drive..."
				: `Select from Google Drive${multiple ? ` (max ${maxFiles})` : ""}`}
		</Button>
	);
}
