import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

export const healthRouter = createTRPCRouter({
	check: publicProcedure.query(() => {
		return {
			status: "ok",
			timestamp: new Date().toISOString(),
		};
	}),
});
