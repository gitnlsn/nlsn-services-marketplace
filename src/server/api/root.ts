import { adminRouter } from "~/server/api/routers/admin";
import { bookingRouter } from "~/server/api/routers/booking";
import { categoryRouter } from "~/server/api/routers/category";
import { communicationRouter } from "~/server/api/routers/communication";
import { dashboardRouter } from "~/server/api/routers/dashboard";
import { escrowRouter } from "~/server/api/routers/escrow";
import { geocodingRouter } from "~/server/api/routers/geocoding";
import { healthRouter } from "~/server/api/routers/health";
import { messageRouter } from "~/server/api/routers/message";
import { notificationRouter } from "~/server/api/routers/notification";
import { notificationsRouter } from "~/server/api/routers/notifications";
import { paymentRouter } from "~/server/api/routers/payment";
import { reviewRouter } from "~/server/api/routers/review";
import { searchRouter } from "~/server/api/routers/search";
import { serviceRouter } from "~/server/api/routers/service";
import { uploadRouter } from "~/server/api/routers/upload";
import { userRouter } from "~/server/api/routers/user";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
	admin: adminRouter,
	booking: bookingRouter,
	category: categoryRouter,
	communication: communicationRouter,
	dashboard: dashboardRouter,
	escrow: escrowRouter,
	geocoding: geocodingRouter,
	health: healthRouter,
	message: messageRouter,
	notification: notificationRouter,
	notifications: notificationsRouter,
	payment: paymentRouter,
	review: reviewRouter,
	search: searchRouter,
	service: serviceRouter,
	upload: uploadRouter,
	user: userRouter,
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
