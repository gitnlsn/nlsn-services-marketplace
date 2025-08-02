"use client";

import { useState } from "react";
import { ConversationList } from "./conversation-list";
import { MessageList } from "./message-list";

interface MessagingInterfaceProps {
	initialConversationId?: string;
}

export function MessagingInterface({
	initialConversationId,
}: MessagingInterfaceProps) {
	const [selectedConversationId, setSelectedConversationId] = useState<
		string | undefined
	>(initialConversationId);
	const [selectedParticipant, setSelectedParticipant] = useState<{
		id: string;
		name: string | null;
		image: string | null;
	} | null>(null);

	const handleSelectConversation = (
		conversationId: string,
		otherParticipant: {
			id: string;
			name: string | null;
			image: string | null;
		},
	) => {
		setSelectedConversationId(conversationId);
		setSelectedParticipant(otherParticipant);
	};

	return (
		<div className="flex h-screen bg-white">
			{/* Conversations Sidebar */}
			<div className="w-80 border-gray-200 border-r bg-white">
				<div className="border-gray-200 border-b px-6 py-4">
					<h1 className="font-semibold text-gray-900 text-lg">Mensagens</h1>
				</div>
				<ConversationList
					selectedConversationId={selectedConversationId}
					onSelectConversation={handleSelectConversation}
				/>
			</div>

			{/* Messages Area */}
			<div className="flex-1">
				{selectedConversationId && selectedParticipant ? (
					<MessageList
						conversationId={selectedConversationId}
						otherParticipant={selectedParticipant}
					/>
				) : (
					<div className="flex h-full items-center justify-center bg-gray-50">
						<div className="text-center">
							<div className="mb-4 text-gray-400">
								<svg
									className="mx-auto h-16 w-16"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
									role="img"
									aria-label="Chat message icon"
								>
									<title>Chat message icon</title>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={1}
										d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
									/>
								</svg>
							</div>
							<h2 className="mb-2 font-semibold text-gray-900 text-xl">
								Selecione uma conversa
							</h2>
							<p className="text-gray-600">
								Escolha uma conversa da lista para começar a conversar.
							</p>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
