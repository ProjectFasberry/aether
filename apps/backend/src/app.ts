import { isProduction, PORT } from "./shared/env";
import { showRoutes, safeJsonParse } from "@repo/shared/lib/utils";
import { Elysia, type ElysiaConfig, type ValidationError } from "elysia";
import { serverTiming as serverTimingPlugin } from "@elysia/server-timing";
// import { prometheusPlugin } from "./lib/plugins/prometheus";
import { openApiPlugin } from "./lib/plugins/openapi";
import { defineSession } from "./lib/middlewares/define";
import { session } from "./modules/auth/login.model";
import { appLogger } from "./utils/config/logger";
import { main, root } from "./routes";
import { corsPlugin, ipPlugin, loggerPlugin } from "./lib/plugins";

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
			if (!isProduction) appLogger.error(error, code);

			let message: string | ValidationError = "INTERNAL_SERVER_ERROR";

			if (code === "VALIDATION") {
				const result = safeJsonParse<ValidationError>(error.message);
				message = result.ok ? result.value : error.message;
				return { error: message };
			}

			if (code === "NOT_FOUND") return { error: code };

			if ("response" in error) {
				const response = error.response as { error?: string } | number;

				if (typeof response === "object" && response !== null) {
					if (response.error) {
						message = response.error;
					}
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
		.onBeforeHandle(async ({ cookie, session: sessionToken }) =>
			await session.updateSession(sessionToken, cookie)
		)
		.use(main);

	showRoutes(app);
	app.listen(PORT);

	appLogger.success(`Starting app finished. Server is running at ${app.server?.hostname}: ${app.server?.port}`);

	return app;
}

export type App = Awaited<ReturnType<typeof startApp>>;