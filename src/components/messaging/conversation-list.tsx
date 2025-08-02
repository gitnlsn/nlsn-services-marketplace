"use client";

import { ChatBubbleLeftIcon } from "@heroicons/react/24/outline";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { api } from "~/trpc/react";

interface ConversationListProps {
	selectedConversationId?: string;
	onSelectConversation: (
		conversationId: string,
		otherParticipant: {
			id: string;
			name: string | null;
			image: string | null;
		},
	) => void;
}

export function ConversationList({
	selectedConversationId,
	onSelectConversation,
}: ConversationListProps) {
	const { data: session } = useSession();
	const currentUserId = session?.user?.id;

	const { data: conversations, isLoading } =
		api.message.getConversations.useQuery(undefined, {
			refetchInterval: 5000, // Refresh conversations every 5 seconds
		});

	const formatLastMessageTime = (date: Date) => {
		const messageDate = new Date(date);
		const now = new Date();
		const diffInHours =
			(now.getTime() - messageDate.getTime()) / (1000 * 60 * 60);

		if (diffInHours < 1) {
			const diffInMinutes = Math.floor(diffInHours * 60);
			return diffInMinutes === 0 ? "Agora" : `${diffInMinutes}m`;
		}
		if (diffInHours < 24) {
			return `${Math.floor(diffInHours)}h`;
		}
		return messageDate.toLocaleDateString("pt-BR", {
			day: "2-digit",
			month: "2-digit",
		});
	};

	const getOtherParticipant = (
		conversation: NonNullable<typeof conversations>[0],
	) => {
		if (!currentUserId) return null;

		return conversation.participantOneId === currentUserId
			? conversation.participantTwo
			: conversation.participantOne;
	};

	if (isLoading) {
		return (
			<div className="p-4">
				<div className="animate-pulse space-y-3">
					{Array.from({ length: 5 }, (_, i) => (
						<div
							key={`conversation-skeleton-${crypto.randomUUID()}-${i}`}
							className="flex items-center space-x-3"
						>
							<div className="h-12 w-12 rounded-full bg-gray-300" />
							<div className="flex-1">
								<div className="mb-1 h-4 rounded bg-gray-300" />
								<div className="h-3 w-3/4 rounded bg-gray-300" />
							</div>
						</div>
					))}
				</div>
			</div>
		);
	}

	if (!conversations || conversations.length === 0) {
		return (
			<div className="flex h-full items-center justify-center p-4">
				<div className="text-center">
					<ChatBubbleLeftIcon className="mx-auto mb-4 h-12 w-12 text-gray-400" />
					<h3 className="mb-2 font-semibold text-gray-900">Nenhuma conversa</h3>
					<p className="text-gray-600 text-sm">
						Suas conversas aparecerão aqui quando você começar a conversar com
						outros usuários.
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="overflow-y-auto">
			{conversations.map((conversation) => {
				const otherParticipant = getOtherParticipant(conversation);
				if (!otherParticipant) return null;

				const lastMessage = conversation.messages?.[0];
				const unreadCount = conversation._count.messages;
				const isSelected = selectedConversationId === conversation.id;

				return (
					<button
						type="button"
						key={conversation.id}
						onClick={() =>
							onSelectConversation(conversation.id, otherParticipant)
						}
						className={`w-full cursor-pointer border-gray-200 border-b p-4 text-left transition-colors hover:bg-gray-50 ${
							isSelected ? "bg-indigo-50" : ""
						}`}
					>
						<div className="flex items-center">
							<div className="relative mr-3 h-12 w-12 flex-shrink-0 overflow-hidden rounded-full">
								<Image
									src={otherParticipant.image || "/placeholder-avatar.jpg"}
									alt={otherParticipant.name || "Usuário"}
									fill
									className="object-cover"
								/>
							</div>

							<div className="min-w-0 flex-1">
								<div className="flex items-center justify-between">
									<h3
										className={`truncate font-medium ${
											unreadCount > 0 ? "text-gray-900" : "text-gray-700"
										}`}
									>
										{otherParticipant.name || "Usuário"}
									</h3>
									{lastMessage && (
										<span className="text-gray-500 text-xs">
											{formatLastMessageTime(lastMessage.createdAt)}
										</span>
									)}
								</div>

								<div className="flex items-center justify-between">
									{lastMessage ? (
										<p
											className={`truncate text-sm ${
												unreadCount > 0
													? "font-medium text-gray-900"
													: "text-gray-600"
											}`}
										>
											{lastMessage.senderId === currentUserId ? "Você: " : ""}
											{lastMessage.content}
										</p>
									) : (
										<p className="text-gray-500 text-sm">
											Nenhuma mensagem ainda
										</p>
									)}

									{unreadCount > 0 && (
										<span className="ml-2 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white text-xs">
											{unreadCount > 9 ? "9+" : unreadCount}
										</span>
									)}
								</div>
							</div>
						</div>
					</button>
				);
			})}
		</div>
	);
}
