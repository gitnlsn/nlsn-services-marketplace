import { adminRouter } from "~/server/api/routers/admin";
import { analyticsRouter } from "~/server/api/routers/analytics";
import { availabilityRouter } from "~/server/api/routers/availability";
import { bookingRouter } from "~/server/api/routers/booking";
import { bookingPolicyRouter } from "~/server/api/routers/booking-policy";
import { categoryRouter } from "~/server/api/routers/category";
import { communicationRouter } from "~/server/api/routers/communication";
import { dashboardRouter } from "~/server/api/routers/dashboard";
import { escrowRouter } from "~/server/api/routers/escrow";
import { geocodingRouter } from "~/server/api/routers/geocoding";
import { googleCalendarRouter } from "~/server/api/routers/google-calendar";
import { groupBookingRouter } from "~/server/api/routers/group-booking";
import { healthRouter } from "~/server/api/routers/health";
import { messageRouter } from "~/server/api/routers/message";
import { notificationRouter } from "~/server/api/routers/notification";
import { notificationsRouter } from "~/server/api/routers/notifications";
import { paymentRouter } from "~/server/api/routers/payment";
import { performanceRouter } from "~/server/api/routers/performance";
import { recurringBookingRouter } from "~/server/api/routers/recurring-booking";
import { reviewRouter } from "~/server/api/routers/review";
import { searchRouter } from "~/server/api/routers/search";
import { serviceRouter } from "~/server/api/routers/service";
import { serviceAddonRouter } from "~/server/api/routers/service-addon";
import { serviceBundleRouter } from "~/server/api/routers/service-bundle";
import { uploadRouter } from "~/server/api/routers/upload";
import { userRouter } from "~/server/api/routers/user";
import { waitlistRouter } from "~/server/api/routers/waitlist";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
	admin: adminRouter,
	analytics: analyticsRouter,
	availability: availabilityRouter,
	booking: bookingRouter,
	bookingPolicy: bookingPolicyRouter,
	category: categoryRouter,
	communication: communicationRouter,
	dashboard: dashboardRouter,
	escrow: escrowRouter,
	geocoding: geocodingRouter,
	googleCalendar: googleCalendarRouter,
	groupBooking: groupBookingRouter,
	health: healthRouter,
	message: messageRouter,
	notification: notificationRouter,
	notifications: notificationsRouter,
	payment: paymentRouter,
	performance: performanceRouter,
	recurringBooking: recurringBookingRouter,
	review: reviewRouter,
	search: searchRouter,
	service: serviceRouter,
	serviceAddon: serviceAddonRouter,
	serviceBundle: serviceBundleRouter,
	upload: uploadRouter,
	user: userRouter,
	waitlist: waitlistRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.someRouter.someMethod();
 */
export const createCaller = createCallerFactory(appRouter);
