import type { IncomingMessage, Server } from "node:http";
import { parse } from "node:url";
import type { Session } from "next-auth";
import { WebSocket, WebSocketServer } from "ws";
import { getServerAuthSession } from "~/server/auth/get-session";
import { db } from "~/server/db";

interface ExtendedWebSocket extends WebSocket {
	isAlive?: boolean;
}

interface WebSocketClient {
	ws: ExtendedWebSocket;
	userId: string;
	session: Session;
}

interface WebSocketMessage {
	type: "ping" | "pong" | "notification" | "booking_update" | "payment_update";
	data?: unknown;
}

class RealtimeWebSocketServer {
	private wss: WebSocketServer | null = null;
	private clients: Map<string, WebSocketClient[]> = new Map();
	private heartbeatInterval: NodeJS.Timeout | null = null;

	initialize(server: Server) {
		if (this.wss) {
			console.log("WebSocket server already initialized");
			return;
		}

		this.wss = new WebSocketServer({
			server,
			path: "/api/ws",
			perMessageDeflate: {
				zlibDeflateOptions: {
					chunkSize: 1024,
					memLevel: 7,
					level: 3,
				},
				zlibInflateOptions: {
					chunkSize: 10 * 1024,
				},
				clientNoContextTakeover: true,
				serverNoContextTakeover: true,
				serverMaxWindowBits: 10,
				concurrencyLimit: 10,
				threshold: 1024,
			},
		});

		this.wss.on("connection", this.handleConnection.bind(this));

		// Start heartbeat check every 30 seconds
		this.heartbeatInterval = setInterval(() => {
			this.checkHeartbeats();
		}, 30000);

		console.log("WebSocket server initialized");
	}

	private async handleConnection(ws: WebSocket, req: IncomingMessage) {
		try {
			// Extract session from request
			const session = await this.authenticateWebSocket(req);
			if (!session || !session.user) {
				ws.close(1008, "Unauthorized");
				return;
			}

			const client: WebSocketClient = {
				ws,
				userId: session.user.id,
				session,
			};

			// Add client to the clients map
			this.addClient(client);

			// Set up event handlers
			ws.on("message", (data) => this.handleMessage(client, data));
			ws.on("close", () => this.handleDisconnect(client));
			ws.on("error", (error) => this.handleError(client, error));
			ws.on("pong", () => this.handlePong(client));

			// Send initial connection success message
			this.sendToClient(client, {
				type: "notification",
				data: {
					message: "Connected to real-time notifications",
					timestamp: new Date().toISOString(),
				},
			});

			// Mark client as alive
			(ws as ExtendedWebSocket).isAlive = true;
		} catch (error) {
			console.error("WebSocket connection error:", error);
			ws.close(1011, "Server error");
		}
	}

	private async authenticateWebSocket(
		req: IncomingMessage,
	): Promise<Session | null> {
		// In a real implementation, you would extract and verify the session token
		// from cookies or query parameters
		// For now, this is a placeholder
		try {
			// Extract session token from query params or cookies
			const url = parse(req.url || "", true);
			const token = url.query.token as string;

			if (!token) {
				return null;
			}

			// Verify token and get session
			// This is simplified - in production, implement proper session verification
			const session = await this.verifySessionToken(token);
			return session;
		} catch (error) {
			console.error("WebSocket authentication error:", error);
			return null;
		}
	}

	private async verifySessionToken(token: string): Promise<Session | null> {
		// Placeholder for session verification
		// In production, verify the JWT token or session cookie
		try {
			// For now, return a mock session
			// TODO: Implement proper session verification
			const user = await db.user.findFirst({
				where: { id: token }, // This is temporary
			});

			if (!user) return null;

			return {
				user: {
					id: user.id,
					email: user.email,
					name: user.name,
					image: user.image,
				},
				expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
			} as Session;
		} catch {
			return null;
		}
	}

	private addClient(client: WebSocketClient) {
		const { userId } = client;
		const userClients = this.clients.get(userId) || [];
		userClients.push(client);
		this.clients.set(userId, userClients);
		console.log(`Client connected: ${userId}`);
	}

	private removeClient(client: WebSocketClient) {
		const { userId } = client;
		const userClients = this.clients.get(userId) || [];
		const updatedClients = userClients.filter((c) => c.ws !== client.ws);

		if (updatedClients.length > 0) {
			this.clients.set(userId, updatedClients);
		} else {
			this.clients.delete(userId);
		}

		console.log(`Client disconnected: ${userId}`);
	}

	private handleMessage(
		client: WebSocketClient,
		data: Buffer | ArrayBuffer | Buffer[],
	) {
		try {
			const message = JSON.parse(data.toString()) as WebSocketMessage;

			switch (message.type) {
				case "ping":
					this.sendToClient(client, { type: "pong" });
					client.ws.isAlive = true;
					break;
				default:
					console.log(`Unknown message type: ${message.type}`);
			}
		} catch (error) {
			console.error("Error handling message:", error);
		}
	}

	private handleDisconnect(client: WebSocketClient) {
		this.removeClient(client);
	}

	private handleError(client: WebSocketClient, error: Error) {
		console.error(`WebSocket error for user ${client.userId}:`, error);
		this.removeClient(client);
	}

	private handlePong(client: WebSocketClient) {
		client.ws.isAlive = true;
	}

	private checkHeartbeats() {
		for (const userClients of this.clients.values()) {
			for (const client of userClients) {
				if (client.ws.isAlive === false) {
					client.ws.terminate();
					continue;
				}

				client.ws.isAlive = false;
				client.ws.ping();
			}
		}
	}

	private sendToClient(client: WebSocketClient, message: WebSocketMessage) {
		if (client.ws.readyState === WebSocket.OPEN) {
			client.ws.send(JSON.stringify(message));
		}
	}

	/**
	 * Send notification to a specific user
	 */
	sendToUser(userId: string, message: WebSocketMessage) {
		const userClients = this.clients.get(userId) || [];
		for (const client of userClients) {
			this.sendToClient(client, message);
		}
	}

	/**
	 * Send notification to multiple users
	 */
	sendToUsers(userIds: string[], message: WebSocketMessage) {
		for (const userId of userIds) {
			this.sendToUser(userId, message);
		}
	}

	/**
	 * Broadcast to all connected clients
	 */
	broadcast(message: WebSocketMessage) {
		for (const userClients of this.clients.values()) {
			for (const client of userClients) {
				this.sendToClient(client, message);
			}
		}
	}

	/**
	 * Send booking update notification
	 */
	sendBookingUpdate(
		userId: string,
		bookingData: {
			type?: string;
			bookingId: string;
			serviceName: string;
			customerName?: string;
			providerName?: string;
			date: string;
			message: string;
			reason?: string;
		},
	) {
		this.sendToUser(userId, {
			type: "booking_update",
			data: bookingData,
		});
	}

	/**
	 * Send payment update notification
	 */
	sendPaymentUpdate(
		userId: string,
		paymentData: {
			paymentId: string;
			status: string;
			amount: number;
			message?: string;
		},
	) {
		this.sendToUser(userId, {
			type: "payment_update",
			data: paymentData,
		});
	}

	/**
	 * Get connected users count
	 */
	getConnectedUsersCount(): number {
		return this.clients.size;
	}

	/**
	 * Get total connections count
	 */
	getTotalConnectionsCount(): number {
		let total = 0;
		for (const userClients of this.clients.values()) {
			total += userClients.length;
		}
		return total;
	}

	/**
	 * Shutdown WebSocket server
	 */
	shutdown() {
		if (this.heartbeatInterval) {
			clearInterval(this.heartbeatInterval);
		}

		if (this.wss) {
			// Close all connections
			for (const userClients of this.clients.values()) {
				for (const client of userClients) {
					client.ws.close(1001, "Server shutting down");
				}
			}

			this.clients.clear();
			this.wss.close();
			this.wss = null;
		}

		console.log("WebSocket server shut down");
	}
}

// Export singleton instance
export const wsServer = new RealtimeWebSocketServer();
