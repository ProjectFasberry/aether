import { store } from "./modules/store";
import { auth } from "./modules/auth";
import { serverGroup } from "./modules/server";
import { shared } from "./modules/shared";
import { root } from "./modules/root";
import { showRoutes } from "./utils/config/print-routes";
import { ipPlugin } from "./lib/plugins/ip";
import { privated } from "./modules/private";
import { rate } from "./modules/user/like.route";
import { Elysia, t, type ElysiaConfig, type ValidationError } from "elysia";
import { serverTiming as serverTimingPlugin } from "@elysiajs/server-timing";
import { me } from "#/modules/user/me.route";
import { rateLimitPlugin } from "./lib/plugins/rate-limit";
import { corsPlugin } from "./lib/plugins/cors";
import { prometheusPlugin } from "./lib/plugins/prometheus";
import { safeJsonParse } from "./utils/config/transforms";
import { loggerPlugin } from "./lib/plugins/logger";
import { openApiPlugin } from "./lib/plugins/openapi";
import { PORT } from "./shared/env";
import { defineSession } from "./lib/middlewares/define";
import { updateSession } from "./modules/auth/auth.model";
import { appLogger } from "./utils/config/logger";

const appConfig: ElysiaConfig<string> = {
	serve: {
		hostname: "0.0.0.0",
	},
	aot: true,
};

export function startApp() {
	appLogger.log(`Starting app...`);

	const app = new Elysia(appConfig)
		// .use(loggerPlugin())
		.group("/perf", (app) =>
			app.get("/ping", () => "pong").post("/user", ({ body }) => ({ status: "ok", received: body.username })),
		)
		.use(prometheusPlugin())
		.use(openApiPlugin())
		.use(rateLimitPlugin())
		.use(serverTimingPlugin())
		.use(ipPlugin())
		.use(corsPlugin())
		.use(root)
		.use(defineSession())
		.onBeforeHandle(async ({ cookie, session }) => updateSession(session, cookie))
		.use(shared)
		.use(auth)
		.use(me)
		.use(serverGroup)
		.use(store)
		.use(privated)
		.use(rate)
		.onError(({ code, error }) => {
			appLogger.error(error, code);

			let message: string | ValidationError = "Internal Server Error";

			if (code === "VALIDATION") {
				const result = safeJsonParse<ValidationError>(error.message);
				message = result.ok ? result.value : error.message;
				return { error: message };
			}

			if ("response" in error) {
				const response = error.response as { error?: string } | number;

				if (typeof response === "object" && response !== null) {
					if (response.error) message = response.error;
				} else {
					message = String(response);
				}
			}

			return { error: message };
		});

	showRoutes(app);
	app.listen(PORT);

	appLogger.success(`Starting app finished`);
	appLogger.log(`Server is running at ${app.server?.hostname}:${app.server?.port}`);

	return app;
}

export type App = Awaited<ReturnType<typeof startApp>>;
