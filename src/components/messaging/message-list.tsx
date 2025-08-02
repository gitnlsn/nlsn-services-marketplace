"use client";

import { PaperAirplaneIcon } from "@heroicons/react/24/outline";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { api } from "~/trpc/react";

interface MessageListProps {
	conversationId: string;
	otherParticipant: {
		id: string;
		name: string | null;
		image: string | null;
	};
}

export function MessageList({
	conversationId,
	otherParticipant,
}: MessageListProps) {
	const { data: session } = useSession();
	const [messageText, setMessageText] = useState("");
	const messagesEndRef = useRef<HTMLDivElement>(null);
	const currentUserId = session?.user?.id;

	// Get messages with infinite query for pagination
	const {
		data: messagesData,
		isLoading,
		fetchNextPage,
		hasNextPage,
	} = api.message.getMessages.useInfiniteQuery(
		{ conversationId, limit: 20 },
		{
			getNextPageParam: (lastPage) => lastPage.nextCursor,
			refetchInterval: 3000, // Poll for new messages every 3 seconds
		},
	);

	// Send message mutation
	const sendMessageMutation = api.message.sendMessage.useMutation({
		onSuccess: () => {
			setMessageText("");
			// Scroll to bottom after sending
			setTimeout(
				() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }),
				100,
			);
		},
	});

	// Mark messages as read mutation
	const markAsReadMutation = api.message.markAsRead.useMutation();

	// Flatten messages from pages
	const messages = messagesData?.pages.flatMap((page) => page.messages) || [];

	// Auto-scroll to bottom on new messages
	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	});

	// Mark messages as read when conversation is opened
	useEffect(() => {
		if (conversationId && currentUserId) {
			markAsReadMutation.mutate({ conversationId });
		}
	}, [conversationId, currentUserId, markAsReadMutation]);

	const handleSendMessage = (e: React.FormEvent) => {
		e.preventDefault();
		if (!messageText.trim() || !currentUserId) return;

		sendMessageMutation.mutate({
			conversationId,
			content: messageText.trim(),
			messageType: "text",
		});
	};

	const formatMessageTime = (date: Date) => {
		return new Date(date).toLocaleTimeString("pt-BR", {
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	const formatMessageDate = (date: Date) => {
		const messageDate = new Date(date);
		const today = new Date();
		const yesterday = new Date(today);
		yesterday.setDate(yesterday.getDate() - 1);

		if (messageDate.toDateString() === today.toDateString()) {
			return "Hoje";
		}
		if (messageDate.toDateString() === yesterday.toDateString()) {
			return "Ontem";
		}
		return messageDate.toLocaleDateString("pt-BR");
	};

	if (isLoading) {
		return (
			<div className="flex h-full items-center justify-center">
				<div className="animate-pulse text-gray-500">
					Carregando mensagens...
				</div>
			</div>
		);
	}

	return (
		<div className="flex h-full flex-col">
			{/* Header */}
			<div className="border-gray-200 border-b bg-white px-6 py-4">
				<div className="flex items-center">
					<div className="relative mr-3 h-10 w-10 overflow-hidden rounded-full">
						<Image
							src={otherParticipant.image || "/placeholder-avatar.jpg"}
							alt={otherParticipant.name || "Usuário"}
							fill
							className="object-cover"
						/>
					</div>
					<div>
						<h2 className="font-semibold text-gray-900">
							{otherParticipant.name || "Usuário"}
						</h2>
						<p className="text-gray-500 text-sm">Online</p>
					</div>
				</div>
			</div>

			{/* Messages */}
			<div className="flex-1 overflow-y-auto bg-gray-50 p-4">
				{hasNextPage && (
					<div className="mb-4 text-center">
						<button
							type="button"
							onClick={() => fetchNextPage()}
							className="rounded bg-gray-200 px-3 py-1 text-gray-600 text-sm hover:bg-gray-300"
						>
							Carregar mensagens anteriores
						</button>
					</div>
				)}

				<div className="space-y-4">
					{messages.map((message, index) => {
						const isOwnMessage = message.senderId === currentUserId;
						const showDate =
							index === 0 ||
							(messages[index - 1]?.createdAt &&
								formatMessageDate(messages[index - 1]?.createdAt) !==
									formatMessageDate(message.createdAt));

						return (
							<div key={message.id}>
								{showDate && (
									<div className="my-4 text-center">
										<span className="rounded-full bg-gray-200 px-3 py-1 text-gray-600 text-xs">
											{formatMessageDate(message.createdAt)}
										</span>
									</div>
								)}

								<div
									className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}
								>
									<div
										className={`flex max-w-xs ${isOwnMessage ? "flex-row-reverse" : "flex-row"}`}
									>
										{!isOwnMessage && (
											<div className="relative mr-2 h-8 w-8 flex-shrink-0 overflow-hidden rounded-full">
												<Image
													src={
														message.sender.image || "/placeholder-avatar.jpg"
													}
													alt={message.sender.name || "Usuário"}
													fill
													className="object-cover"
												/>
											</div>
										)}

										<div
											className={`rounded-lg px-3 py-2 ${
												isOwnMessage
													? "bg-indigo-600 text-white"
													: "bg-white text-gray-900"
											}`}
										>
											<p className="text-sm">{message.content}</p>
											<p
												className={`mt-1 text-xs ${
													isOwnMessage ? "text-indigo-200" : "text-gray-500"
												}`}
											>
												{formatMessageTime(message.createdAt)}
											</p>
										</div>
									</div>
								</div>
							</div>
						);
					})}
				</div>
				<div ref={messagesEndRef} />
			</div>

			{/* Message Input */}
			<div className="border-gray-200 border-t bg-white p-4">
				<form
					onSubmit={handleSendMessage}
					className="flex items-center space-x-2"
				>
					<input
						type="text"
						value={messageText}
						onChange={(e) => setMessageText(e.target.value)}
						placeholder="Digite sua mensagem..."
						className="flex-1 rounded-lg border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
						disabled={sendMessageMutation.isPending}
					/>
					<button
						type="submit"
						disabled={!messageText.trim() || sendMessageMutation.isPending}
						className="rounded-lg bg-indigo-600 p-2 text-white hover:bg-indigo-700 disabled:opacity-50"
					>
						<PaperAirplaneIcon className="h-5 w-5" />
					</button>
				</form>
			</div>
		</div>
	);
}
