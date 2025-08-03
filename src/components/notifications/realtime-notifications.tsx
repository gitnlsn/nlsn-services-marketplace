"use client";

import { Bell, X } from "lucide-react";
import { useState } from "react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { useRealtimeNotifications } from "~/hooks/use-websocket";
import { cn } from "~/lib/utils";

export function RealtimeNotifications() {
	const { notifications, isConnected, clearNotifications, removeNotification } =
		useRealtimeNotifications();
	const [isOpen, setIsOpen] = useState(false);

	const unreadCount = notifications.length;

	const getNotificationIcon = (type: string) => {
		switch (type) {
			case "booking":
				return "📅";
			case "payment":
				return "💰";
			default:
				return "🔔";
		}
	};

	const getNotificationColor = (type: string) => {
		switch (type) {
			case "booking":
				return "text-blue-600";
			case "payment":
				return "text-green-600";
			default:
				return "text-gray-600";
		}
	};

	return (
		<div className="relative">
			<DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
				<DropdownMenuTrigger asChild>
					<Button
						variant="ghost"
						size="icon"
						className="relative"
						aria-label="Notificações"
					>
						<Bell className="h-5 w-5" />
						{unreadCount > 0 && (
							<Badge
								className="-top-1 -right-1 absolute h-5 min-w-[20px] px-1"
								variant="destructive"
							>
								{unreadCount > 99 ? "99+" : unreadCount}
							</Badge>
						)}
						{isConnected && (
							<span className="absolute right-0 bottom-0 h-2 w-2 rounded-full bg-green-500" />
						)}
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end" className="w-80">
					<div className="flex items-center justify-between border-b p-3">
						<h3 className="font-semibold">Notificações</h3>
						{unreadCount > 0 && (
							<Button
								variant="ghost"
								size="sm"
								onClick={() => clearNotifications()}
								className="h-auto p-1 text-xs"
							>
								Limpar tudo
							</Button>
						)}
					</div>
					<div className="max-h-96 overflow-y-auto">
						{notifications.length === 0 ? (
							<div className="p-8 text-center text-muted-foreground text-sm">
								Nenhuma notificação nova
							</div>
						) : (
							notifications.map((notification) => (
								<DropdownMenuItem
									key={notification.id}
									className="flex cursor-pointer items-start gap-3 p-3 hover:bg-gray-50"
									onSelect={(e) => e.preventDefault()}
								>
									<span className="mt-1 text-lg">
										{getNotificationIcon(notification.type)}
									</span>
									<div className="flex-1 space-y-1">
										<p
											className={cn(
												"font-medium text-sm",
												getNotificationColor(notification.type),
											)}
										>
											{notification.message}
										</p>
										{notification.timestamp && (
											<p className="text-muted-foreground text-xs">
												{new Date(notification.timestamp).toLocaleString(
													"pt-BR",
												)}
											</p>
										)}
									</div>
									<Button
										variant="ghost"
										size="icon"
										className="h-6 w-6"
										onClick={(e) => {
											e.stopPropagation();
											removeNotification(notification.id);
										}}
									>
										<X className="h-3 w-3" />
									</Button>
								</DropdownMenuItem>
							))
						)}
					</div>
					{!isConnected && (
						<div className="border-t p-2">
							<p className="text-center text-muted-foreground text-xs">
								⚠️ Desconectado - Reconectando...
							</p>
						</div>
					)}
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	);
}
