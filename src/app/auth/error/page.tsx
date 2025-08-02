"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

const errors: Record<string, string> = {
	Configuration: "There is a problem with the server configuration.",
	AccessDenied: "You do not have permission to sign in.",
	Verification: "The verification token has expired or has already been used.",
	OAuthSignin: "Error constructing an authorization URL.",
	OAuthCallback: "Error handling the response from the OAuth provider.",
	OAuthCreateAccount: "Could not create OAuth provider user in the database.",
	EmailCreateAccount: "Could not create email provider user in the database.",
	Callback: "Error in the OAuth callback handler route.",
	OAuthAccountNotLinked:
		"This email is already associated with another account.",
	EmailSignin: "The e-mail could not be sent.",
	CredentialsSignin:
		"Sign in failed. Check the details you provided are correct.",
	SessionRequired: "Please sign in to access this page.",
	Default: "Unable to sign in.",
};

export default function AuthErrorPage() {
	const searchParams = useSearchParams();
	const error = searchParams.get("error");
	const errorMessage = error && errors[error] ? errors[error] : errors.Default;

	return (
		<div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#2e026d] to-[#15162c]">
			<div className="w-full max-w-md space-y-8 rounded-xl bg-white p-8 shadow-lg">
				<div className="text-center">
					<h1 className="font-bold text-3xl text-gray-900">
						Authentication Error
					</h1>
					<div className="mt-4 rounded-md bg-red-50 p-4">
						<p className="text-red-800 text-sm">{errorMessage}</p>
						{error === "OAuthAccountNotLinked" && (
							<p className="mt-2 text-red-600 text-xs">
								Try signing in with the same method you used when you first
								created your account.
							</p>
						)}
					</div>
				</div>

				<div className="mt-8 space-y-4">
					<Link
						href="/auth/signin"
						className="flex w-full justify-center rounded-md bg-indigo-600 px-4 py-2 font-medium text-sm text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
					>
						Try Again
					</Link>
					<Link
						href="/"
						className="flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 font-medium text-gray-700 text-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
					>
						Go Home
					</Link>
				</div>

				<p className="mt-8 text-center text-gray-500 text-xs">
					If this problem persists, please{" "}
					<a
						href="mailto:support@marketplace.com"
						className="font-medium text-indigo-600 hover:text-indigo-500"
					>
						contact support
					</a>
				</p>
			</div>
		</div>
	);
}
