import Elysia, { t, type ElysiaConfig, type ValidationError } from "elysia";
import { appLogger } from "./shared/logger";
import { corsPlugin, loggerPlugin, openApiPlugin } from "./lib/plugins";
import { defineSession } from "./lib/define";
import { safeJsonParse, showRoutes } from "@repo/shared/lib/utils";
import { env } from "./shared/env";
import { service } from "./modules/service";
import { html } from '@elysia/html'

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
      .use(html())
      .get('/', () => `
        <html lang='en'>
          <head>
            <title>Glaux API</title>
          </head>
          <body>
            <a href="/openapi">Docs</a>
          </body>
          <style>
            html {
              font-family: sans-serif;
            }
            body {
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              max-height: 100vh;
              overflow: hidden;
              background-color: #3D3D3D;
            }
            a {
              text-decoration: none;
              color: #fff;
              display: inline-flex;
              align-items: center;
              justify-content: center;
              border-radius: 1rem;
              background-color: #000000;
              padding: 0.5rem 1rem;
            }
          </style>
        </html>`, {
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
