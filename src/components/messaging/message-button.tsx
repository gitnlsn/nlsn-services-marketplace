"use client";

import { ChatBubbleLeftIcon } from "@heroicons/react/24/outline";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";

interface MessageButtonProps {
	participantId: string;
	participantName?: string;
	bookingId?: string;
	className?: string;
	variant?: "primary" | "secondary";
}

export function MessageButton({
	participantId,
	participantName,
	bookingId,
	className = "",
	variant = "secondary",
}: MessageButtonProps) {
	const { data: session } = useSession();
	const router = useRouter();

	const createConversationMutation = api.message.createConversation.useMutation(
		{
			onSuccess: (conversation) => {
				// Redirect to messages page with the conversation selected
				router.push(`/messages?conversation=${conversation.id}`);
			},
		},
	);

	const handleMessageParticipant = async () => {
		if (!session?.user?.id) {
			// Redirect to login if not authenticated
			router.push(
				`/auth/signin?callbackUrl=${encodeURIComponent(window.location.href)}`,
			);
			return;
		}

		if (session.user.id === participantId) {
			// Can't message yourself
			return;
		}

		try {
			await createConversationMutation.mutateAsync({
				participantTwoId: participantId,
				bookingId,
			});
		} catch (error) {
			console.error("Failed to create conversation:", error);
		}
	};

	const baseClasses =
		"inline-flex items-center justify-center rounded-lg px-4 py-2 font-medium transition-colors";
	const variantClasses = {
		primary: "bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50",
		secondary:
			"border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50",
	};

	return (
		<button
			type="button"
			onClick={handleMessageParticipant}
			disabled={
				createConversationMutation.isPending ||
				session?.user?.id === participantId
			}
			className={`${baseClasses} ${variantClasses[variant]} ${className}`}
		>
			<ChatBubbleLeftIcon className="mr-2 h-5 w-5" />
			{createConversationMutation.isPending
				? "Iniciando..."
				: `Conversar${participantName ? ` com ${participantName}` : ""}`}
		</button>
	);
}
