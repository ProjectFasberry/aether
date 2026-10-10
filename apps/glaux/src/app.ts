import Elysia, { t, type ElysiaConfig, type ValidationError } from "elysia";
import { appLogger } from "./shared/logger";
import { corsPlugin, loggerPlugin, openApiPlugin } from "./lib/plugins";
import { defineSession } from "./lib/define";
import { getEnv } from "./shared/env";
import { service } from "./modules/service";
import { html } from '@elysia/html';
import previewHtml from "../static/preview.html" with { type: "text" }
import { safeJsonParse } from "@repo/shared/utils";
import { showRoutes } from "@repo/shared/lib/helpers";

const appConfig: ElysiaConfig<string> = {
  serve: {
    hostname: "0.0.0.0",
  },
  aot: true,
};

const root = new Elysia()
  .group("", app => app
    .use(html())
    // @ts-expect-error
    .get('/', ({ html }) => html(previewHtml), {
      detail: {
        summary: "Return static welcome HTML"
      }
    })
    .get("/favicon.ico", () => "")
    .get("/health", ({ status }) => status(200, "OK"), {
      response: {
        200: t.Literal("OK"),
        500: t.Object({
          error: t.Literal("INTERNAL_SERVER_ERROR")
        }),
      },
      detail: {
        summary: "Healthcheck"
      },
    })
  )
  .group("", app => app
    .use(defineSession())
    .use(service)
  )

const app = new Elysia(appConfig)
  .use(loggerPlugin())
  .use(corsPlugin())
  .use(openApiPlugin())
  .use(root)
  .onError(({ code, error }) => {
    let message: string | ValidationError = "INTERNAL_SERVER_ERROR";

    if (code === "VALIDATION") {
      const result = safeJsonParse<ValidationError>(error.message);
      message = result.ok ? result.value : error.message;
      return { error: message };
    }

    if (code === "NOT_FOUND") {
      return { error: "Not found" };
    }

    if ("response" in error) {
      const res = error.response as { error?: string } | number;
      appLogger.error(error);

      if (typeof res === "object" && res !== null) {
        if (res.error) {
          message = res.error;
        }
      } else {
        message = String(res);
      }
    }

    return { error: message };
  });

export function startApp() {
  if (getEnv().verbose) {
    showRoutes({ routes: app.routes });
  }

  app.listen(getEnv().PORT);

  appLogger.info(
    `Server is running. Preview at http://${app.server?.hostname}:${app.server?.port}`
  );
}
