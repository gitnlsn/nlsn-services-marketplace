import { type NextRequest, NextResponse } from "next/server";
import {
	cancelExpiredBookings,
	cleanupOldNotifications,
	generateServiceEmbeddings,
	releaseEscrowFunds,
	runScheduledTasks,
	sendBookingReminders,
	updateServiceRatings,
} from "~/server/services/cron";

// API endpoint for running cron jobs
// This can be called by external cron services like Vercel Cron or GitHub Actions
export async function POST(request: NextRequest) {
	try {
		// Verify request is from a trusted source
		const authHeader = request.headers.get("authorization");
		const expectedToken = process.env.CRON_SECRET;

		if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		// Get task type from request body
		const body = await request.json();
		const { task } = body;

		console.log(`Running cron task: ${task || "all"}`);

		switch (task) {
			case "escrow":
				await releaseEscrowFunds();
				break;
			case "notifications":
				await cleanupOldNotifications();
				break;
			case "reminders":
				await sendBookingReminders();
				break;
			case "ratings":
				await updateServiceRatings();
				break;
			case "bookings":
				await cancelExpiredBookings();
				break;
			case "embeddings":
				await generateServiceEmbeddings();
				break;
			default:
				await runScheduledTasks();
				break;
		}

		return NextResponse.json(
			{ success: true, task: task || "all" },
			{ status: 200 },
		);
	} catch (error) {
		console.error("Cron job error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

// Health check endpoint
export async function GET() {
	return NextResponse.json(
		{ status: "healthy", timestamp: new Date().toISOString() },
		{ status: 200 },
	);
}
