import Elysia, { redirect, type ElysiaConfig, type ValidationError } from "elysia";
import { appLogger } from "./shared/logger";
import { corsPlugin, loggerPlugin, openApiPlugin } from "./lib/plugins";
import { defineSession } from "./lib/define";
import { safeJsonParse, showRoutes } from "@repo/shared/lib/utils";
import { env } from "./shared/env";
import { service } from "./modules/service";

const appConfig: ElysiaConfig<string> = {
  serve: {
    hostname: "0.0.0.0",
  },
  aot: true,
};

export function startApp() {
  const app = new Elysia(appConfig)
    .use(loggerPlugin())
    .use(corsPlugin())
    .use(openApiPlugin())
    .group("", app => app
      .get("/", () => redirect("/openapi"))
      .get("/health", ({ status }) => status(200))
    )
    .group("", app => app
      .use(defineSession())
      .use(service)
    )
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
        appLogger.error(error);

        if (typeof response === "object" && response !== null) {
          if (response.error) message = response.error;
        } else {
          message = String(response);
        }
      }

      return { error: message };
    });

  showRoutes({ routes: app.routes });
  app.listen(env.PORT);

  appLogger.info(`Server is running at ${app.server?.hostname}:${app.server?.port}`);
}
