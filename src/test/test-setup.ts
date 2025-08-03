import { vi } from "vitest";

// Mock WebSocket server
vi.mock("../server/websocket/websocket-server", () => ({
	wsServer: {
		broadcast: vi.fn(),
		sendToUser: vi.fn(),
		sendToRoom: vi.fn(),
		sendBookingUpdate: vi.fn(),
	},
}));

// Mock notification service
vi.mock("../server/services/notification-service", () => ({
	notificationService: {
		sendNotification: vi.fn().mockResolvedValue(undefined),
		sendEmail: vi.fn().mockResolvedValue(undefined),
		sendSMS: vi.fn().mockResolvedValue(undefined),
		sendWhatsApp: vi.fn().mockResolvedValue(undefined),
	},
	NotificationTypes: {
		NEW_BOOKING: "new_booking",
		BOOKING_ACCEPTED: "booking_accepted",
		BOOKING_DECLINED: "booking_declined",
		BOOKING_CANCELLED: "booking_cancelled",
		SERVICE_COMPLETED: "service_completed",
		PAYMENT_RECEIVED: "payment_received",
		PAYMENT_FAILED: "payment_failed",
		NEW_REVIEW: "new_review",
		SERVICE_UPDATE: "service_update",
		REMINDER: "reminder",
	},
}));

// Mock Next-Auth if needed
vi.mock("next-auth", () => ({
	default: vi.fn(),
	getServerSession: vi.fn(),
}));

// Mock Next.js server if needed
vi.mock("next/server", () => ({
	NextRequest: vi.fn(),
	NextResponse: vi.fn(),
}));
