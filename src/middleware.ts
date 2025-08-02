import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "~/server/auth";

export async function middleware(request: NextRequest) {
	const pathname = request.nextUrl.pathname;

	// Protected paths that require authentication
	const protectedPaths = [
		"/dashboard",
		"/bookings",
		"/services/create",
		"/services/edit",
		"/profile/edit",
		"/settings",
		"/earnings",
	];

	const isProtectedPath = protectedPaths.some((path) =>
		pathname.startsWith(path),
	);

	if (!isProtectedPath) {
		return NextResponse.next();
	}

	// Get the session
	const session = await auth();

	if (!session?.user) {
		const url = new URL("/login", request.url);
		url.searchParams.set("returnUrl", pathname);
		return NextResponse.redirect(url);
	}

	// Professional-only paths
	const professionalOnlyPaths = [
		"/dashboard",
		"/services/create",
		"/services/edit",
		"/earnings",
	];

	const isProfessionalPath = professionalOnlyPaths.some((path) =>
		pathname.startsWith(path),
	);

	if (isProfessionalPath && !session.user.isProfessional) {
		const url = new URL("/become-professional", request.url);
		url.searchParams.set("returnUrl", pathname);
		return NextResponse.redirect(url);
	}

	return NextResponse.next();
}

export const config = {
	matcher: [
		"/dashboard/:path*",
		"/bookings/:path*",
		"/services/(create|edit)/:path*",
		"/profile/edit/:path*",
		"/settings/:path*",
		"/earnings/:path*",
	],
};
