import { isProduction, PORT } from "./shared/env";
import { showRoutes, safeJsonParse } from "@repo/shared/lib/utils";
import { Elysia, type ElysiaConfig, type ValidationError } from "elysia";
import { serverTiming as serverTimingPlugin } from "@elysiajs/server-timing";
import { corsPlugin } from "./lib/plugins/cors";
import { ipPlugin } from "./lib/plugins/ip";
// import { prometheusPlugin } from "./lib/plugins/prometheus";
import { openApiPlugin } from "./lib/plugins/openapi";
import { loggerPlugin } from "./lib/plugins/logger";
import { defineSession } from "./lib/middlewares/define";
import { updateSession } from "./modules/auth/auth.model";
import { appLogger } from "./utils/config/logger";
import { main, root } from "./routes";

const appConfig: ElysiaConfig<string> = {
	serve: {
		hostname: "0.0.0.0",
	},
	aot: true,
};

export function startApp() {
	appLogger.log(`Starting app...`);

	const app = new Elysia(appConfig)
		// .use(prometheusPlugin())
		.use(openApiPlugin())
		.use(serverTimingPlugin())
		.use(ipPlugin())
		.use(corsPlugin())
		.use(loggerPlugin())
		.onError((payload) => {
			const { error, code } = payload;
			if (!isProduction) {
				appLogger.error(error, code);
			}

			let message: string | ValidationError = "Internal Server Error";

			if (code === "VALIDATION") {
				const result = safeJsonParse<ValidationError>(error.message);
				message = result.ok ? result.value : error.message;
				return { error: message };
			}

			if (code === "NOT_FOUND") {
				return { error: "Not found" };
			}

			if ("response" in error) {
				const response = error.response as { error?: string } | number;
				appLogger.error(error, code);

				if (typeof response === "object" && response !== null) {
					if (response.error) message = response.error;
				} else {
					message = String(response);
				}
			}

			if (error instanceof Error) {
				return { error: error.message };
			}

			return { error: message };
		})
		.use(root)
		.use(defineSession())
		.onBeforeHandle(async ({ cookie, session }) => await updateSession(session, cookie))
		.use(main);

	showRoutes(app);
	app.listen(PORT);

	appLogger.success(`Starting app finished`);
	appLogger.log(`Server is running at ${app.server?.hostname}:${app.server?.port}`);

	return app;
}

export type App = Awaited<ReturnType<typeof startApp>>;
