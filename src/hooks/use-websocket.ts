import { useSession } from "next-auth/react";
import { useCallback, useEffect, useRef, useState } from "react";

interface WebSocketMessage {
	type: "ping" | "pong" | "notification" | "booking_update" | "payment_update";
	data?: unknown;
}

interface BookingUpdateData {
	type?: string;
	bookingId: string;
	serviceName: string;
	customerName?: string;
	providerName?: string;
	date: string;
	message: string;
	reason?: string;
}

interface PaymentUpdateData {
	paymentId: string;
	status: string;
	amount: number;
	message?: string;
}

interface NotificationData {
	id: number;
	title: string;
	message: string;
	type: string;
	createdAt: string;
	timestamp?: string;
}

interface UseWebSocketOptions {
	onMessage?: (message: WebSocketMessage) => void;
	onBookingUpdate?: (data: BookingUpdateData) => void;
	onPaymentUpdate?: (data: PaymentUpdateData) => void;
	onNotification?: (data: NotificationData) => void;
	reconnectInterval?: number;
	maxReconnectAttempts?: number;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
	const {
		onMessage,
		onBookingUpdate,
		onPaymentUpdate,
		onNotification,
		reconnectInterval = 5000,
		maxReconnectAttempts = 5,
	} = options;

	const { data: session, status } = useSession();
	const [isConnected, setIsConnected] = useState(false);
	const [reconnectAttempt, setReconnectAttempt] = useState(0);
	const wsRef = useRef<WebSocket | null>(null);
	const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);

	const connect = useCallback(() => {
		if (status !== "authenticated" || !session?.user?.id) {
			return;
		}

		try {
			// Construct WebSocket URL
			const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
			const host = window.location.host;
			const wsUrl = `${protocol}//${host}/api/ws?token=${session.user.id}`;

			const ws = new WebSocket(wsUrl);
			wsRef.current = ws;

			ws.onopen = () => {
				console.log("WebSocket connected");
				setIsConnected(true);
				setReconnectAttempt(0);

				// Start ping interval
				pingIntervalRef.current = setInterval(() => {
					if (ws.readyState === WebSocket.OPEN) {
						ws.send(JSON.stringify({ type: "ping" }));
					}
				}, 30000);
			};

			ws.onmessage = (event) => {
				try {
					const message = JSON.parse(event.data) as WebSocketMessage;

					// Handle specific message types
					switch (message.type) {
						case "booking_update":
							onBookingUpdate?.(message.data as BookingUpdateData);
							break;
						case "payment_update":
							onPaymentUpdate?.(message.data as PaymentUpdateData);
							break;
						case "notification":
							onNotification?.(message.data as NotificationData);
							break;
					}

					// Call general message handler
					onMessage?.(message);
				} catch (error) {
					console.error("Error parsing WebSocket message:", error);
				}
			};

			ws.onerror = (error) => {
				console.error("WebSocket error:", error);
			};

			ws.onclose = (event) => {
				console.log("WebSocket disconnected", event.code, event.reason);
				setIsConnected(false);
				wsRef.current = null;

				// Clear ping interval
				if (pingIntervalRef.current) {
					clearInterval(pingIntervalRef.current);
					pingIntervalRef.current = null;
				}

				// Attempt to reconnect if not a deliberate close
				if (event.code !== 1000 && reconnectAttempt < maxReconnectAttempts) {
					setReconnectAttempt((prev) => prev + 1);
					reconnectTimeoutRef.current = setTimeout(() => {
						console.log(
							`Attempting to reconnect... (${reconnectAttempt + 1}/${maxReconnectAttempts})`,
						);
						connect();
					}, reconnectInterval);
				}
			};
		} catch (error) {
			console.error("Error creating WebSocket connection:", error);
		}
	}, [
		session,
		status,
		onMessage,
		onBookingUpdate,
		onPaymentUpdate,
		onNotification,
		reconnectAttempt,
		reconnectInterval,
		maxReconnectAttempts,
	]);

	const disconnect = useCallback(() => {
		if (reconnectTimeoutRef.current) {
			clearTimeout(reconnectTimeoutRef.current);
			reconnectTimeoutRef.current = null;
		}

		if (pingIntervalRef.current) {
			clearInterval(pingIntervalRef.current);
			pingIntervalRef.current = null;
		}

		if (wsRef.current) {
			wsRef.current.close(1000, "Client disconnect");
			wsRef.current = null;
		}

		setIsConnected(false);
	}, []);

	const sendMessage = useCallback((message: WebSocketMessage) => {
		if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
			wsRef.current.send(JSON.stringify(message));
			return true;
		}
		return false;
	}, []);

	// Auto-connect when authenticated
	useEffect(() => {
		if (status === "authenticated" && session?.user?.id) {
			connect();
		}

		return () => {
			disconnect();
		};
	}, [status, session, connect, disconnect]);

	return {
		isConnected,
		sendMessage,
		reconnectAttempt,
		connect,
		disconnect,
	};
}

// Hook for real-time notifications
export function useRealtimeNotifications() {
	const [notifications, setNotifications] = useState<NotificationData[]>([]);

	const handleNotification = useCallback((data: NotificationData) => {
		setNotifications((prev) => [...prev, { ...data, id: Date.now() }]);

		// Show browser notification if permitted
		if ("Notification" in window && Notification.permission === "granted") {
			new Notification("Nova notificação", {
				body: data.message || "Você tem uma nova notificação",
				icon: "/icon-192.png",
			});
		}
	}, []);

	const { isConnected } = useWebSocket({
		onNotification: handleNotification,
		onBookingUpdate: (data) => {
			handleNotification({
				id: Date.now(),
				title: "Atualização de Reserva",
				message: data.message || "Atualização de reserva",
				type: "booking",
				createdAt: new Date().toISOString(),
				bookingId: data.bookingId,
				serviceName: data.serviceName,
			} as NotificationData);
		},
		onPaymentUpdate: (data) => {
			handleNotification({
				id: Date.now() + 1,
				title: "Atualização de Pagamento",
				message: data.message || "Atualização de pagamento",
				type: "payment",
				createdAt: new Date().toISOString(),
				paymentId: data.paymentId,
				amount: data.amount,
			} as NotificationData);
		},
	});

	const clearNotifications = useCallback(() => {
		setNotifications([]);
	}, []);

	const removeNotification = useCallback((id: number) => {
		setNotifications((prev) => prev.filter((n) => n.id !== id));
	}, []);

	// Request notification permission
	useEffect(() => {
		if ("Notification" in window && Notification.permission === "default") {
			Notification.requestPermission();
		}
	}, []);

	return {
		notifications,
		isConnected,
		clearNotifications,
		removeNotification,
	};
}
