import { env } from "./shared/env";
import { Elysia, type ElysiaConfig, type ValidationError } from "elysia";
import { serverTiming as serverTimingPlugin } from "@elysia/server-timing";
import { openApiPlugin } from "./lib/plugins/openapi";
import { defineOptionalSession } from "./lib/define";
import { session } from "./modules/auth/login.model";
import { appLogger } from "./shared/constants/logger";
import { main, root } from "./routes";
import { corsPlugin, ipPlugin, loggerPlugin } from "./lib/plugins";
import { logging } from "./shared/constants";
import { safeJsonParse, showRoutes } from "./utils";

const appConfig: ElysiaConfig<string> = {
	serve: {
		hostname: "0.0.0.0",
	},
	aot: true,
};

export function startApp() {
	const app = new Elysia(appConfig)
		.use(openApiPlugin())
		.use(serverTimingPlugin())
		.use(ipPlugin())
		.use(corsPlugin())
		.use(loggerPlugin())
		.onError((payload) => {
			const { error, code } = payload;
			if (logging.globalError) appLogger.error(error, code);

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
		.use(defineOptionalSession())
		.onBeforeHandle(
			async ({ cookie, session: sessionToken }) => await session.updateSession(sessionToken ?? null, cookie),
		)
		.use(main);

	showRoutes({ routes: app.routes, logger: appLogger });
	app.listen(env.PORT);

	appLogger.success(`Server is running at ${app.server?.hostname}: ${app.server?.port}`);

	return app;
}

export type App = Awaited<ReturnType<typeof startApp>>;
