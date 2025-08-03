import type { IncomingMessage } from "node:http";
import { auth } from "./index";

export async function getServerAuthSession(
	req: IncomingMessage,
): Promise<unknown> {
	// For WebSocket connections, we need to extract session from request
	// This is a simplified implementation - in production, you'd need proper session handling
	try {
		// Get session from cookies or headers
		return await auth();
	} catch (error) {
		console.error("Failed to get session:", error);
		return null;
	}
}
