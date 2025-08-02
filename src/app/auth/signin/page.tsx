import { redirect } from "next/navigation";
import { GoogleSignInButton } from "~/app/_components/auth/google-signin-button";
import { auth } from "~/server/auth";

export default async function SignInPage({
	searchParams,
}: {
	searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
	const session = await auth();
	const { callbackUrl, error } = await searchParams;

	// If already signed in, redirect to callback URL or home
	if (session) {
		redirect(callbackUrl ?? "/");
	}

	return (
		<div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#2e026d] to-[#15162c]">
			<div className="w-full max-w-md space-y-8 rounded-xl bg-white p-8 shadow-lg">
				<div className="text-center">
					<h1 className="font-bold text-3xl text-gray-900">Welcome Back</h1>
					<p className="mt-2 text-gray-600 text-sm">
						Sign in to access your account
					</p>
				</div>

				{error && (
					<div className="rounded-md bg-red-50 p-4">
						<p className="text-red-800 text-sm">
							{error === "OAuthAccountNotLinked"
								? "This email is already associated with another account."
								: "An error occurred during sign in. Please try again."}
						</p>
					</div>
				)}

				<div className="mt-8 space-y-4">
					<GoogleSignInButton callbackUrl={callbackUrl} />

					<div className="relative">
						<div className="absolute inset-0 flex items-center">
							<div className="w-full border-gray-300 border-t" />
						</div>
						<div className="relative flex justify-center text-sm">
							<span className="bg-white px-2 text-gray-500">
								Secure authentication powered by Google
							</span>
						</div>
					</div>
				</div>

				<p className="mt-8 text-center text-gray-500 text-xs">
					By signing in, you agree to our{" "}
					<a
						href="/terms"
						className="font-medium text-indigo-600 hover:text-indigo-500"
					>
						Terms of Service
					</a>{" "}
					and{" "}
					<a
						href="/privacy"
						className="font-medium text-indigo-600 hover:text-indigo-500"
					>
						Privacy Policy
					</a>
				</p>
			</div>
		</div>
	);
}
