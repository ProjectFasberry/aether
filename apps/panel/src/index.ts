import { Elysia, type ElysiaConfig, type ValidationError } from "elysia";
import { service } from "./modules/service";
import { isProduction, PORT } from "./shared/env";
import { appLogger } from "./shared/logger";
import { initRedis } from "./shared/redis";
import { loggerPlugin } from "./plugins/logger";
import { corsPlugin } from "./plugins/cors";
import { ipPlugin } from "./plugins/ip";
import { checkDatabasesHealth } from "./shared/init-db";
import { initChats } from "./shared/bot/chats";
import { startGuardBot } from "./shared/bot";
import { defineSession } from "./plugins/define";
import { showRoutes, safeJsonParse } from "@repo/shared/lib/utils";

const appConfig: ElysiaConfig<string> = {
	serve: {
		hostname: "0.0.0.0",
	},
	aot: true,
};

async function entrypoint() {
	await checkDatabasesHealth();
	await initChats();
}

async function services() {
	await initRedis();
}

function startApp() {
	appLogger.log(`Starting app...`);

	const routes = new Elysia().use(service);

	const app = new Elysia(appConfig)
		.use(loggerPlugin())
		.use(ipPlugin())
		.use(corsPlugin())
		.use(defineSession())
		.use(routes)
		.onError(({ code, error }) => {
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

			return { error: message };
		});

	showRoutes(app);
	app.listen(PORT);

	appLogger.success(`Starting app finished. Server is running at ${app.server?.hostname}:${app.server?.port}`);

	return app;
}

async function start() {
	await entrypoint();
	await services();

	if (isProduction) {
		startGuardBot();
	}

	startApp();
}

start();

export type App = Awaited<ReturnType<typeof startApp>>;
