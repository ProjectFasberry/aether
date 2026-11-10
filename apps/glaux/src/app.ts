import Elysia, { t, type ElysiaConfig } from "elysia";
import { appLogger } from "./shared/logger";
import { corsPlugin, loggerPlugin, openApiPlugin } from "./lib/plugins";
import { defineSession } from "./lib/define";
import { getEnv } from "./shared/env";
import { service } from "./modules/service";
import previewHtml from "../static/preview.html" with { type: "text" }
import { showRoutes } from "@repo/shared/lib/helpers";
import { isShuttingDown } from "./shared/shutdown";
import { requestIdPlugin } from "@repo/core/lib/elysia/request-id";
import { logging } from "./shared/state";

const appConfig: ElysiaConfig<string> = {
  serve: {
    hostname: "0.0.0.0",
  },
  aot: true,
};

type ErrorPayload = { error: string };

/** Stable error codes for statuses that reach `onError` without a body. */
const STATUS_ERROR: Record<number, string> = {
  400: "BAD_REQUEST",
  401: "UNAUTHORIZED",
  403: "FORBIDDEN",
  404: "Not found",
  405: "METHOD_NOT_ALLOWED",
  413: "PAYLOAD_TOO_LARGE",
  422: "VALIDATION",
  429: "TOO_MANY_REQUESTS",
  500: "INTERNAL_SERVER_ERROR",
  503: "SERVICE_UNAVAILABLE",
};

const statusError = (status: number): string =>
  STATUS_ERROR[status] ?? (status >= 500 ? "INTERNAL_SERVER_ERROR" : "BAD_REQUEST");

type CaughtError = {
  code?: unknown;
  status?: unknown;
  type?: unknown;
  response?: unknown;
};

// `@elysia/html` registers a global `mapResponse` that returns `undefined` for
// non-HTML values; in the `onError` path Elysia then replaces the error body
// with that `undefined`. The single static page is served directly instead, so
// JSON errors from `onError` survive.
const PREVIEW_HTML = previewHtml as unknown as string;

const root = new Elysia()
  .group("", app => app
    .get('/', () => new Response(PREVIEW_HTML, {
      headers: { "content-type": "text/html; charset=utf-8" },
    }), {
      detail: {
        summary: "Return static welcome HTML"
      }
    })
    .get("/favicon.ico", () => "")
    .get("/health", ({ status }) => {
      if (isShuttingDown()) {
        return status(503, { error: "SHUTTING_DOWN" });
      }

      return status(200, "OK");
    }, {
      response: {
        200: t.Literal("OK"),
        503: t.Object({
          error: t.Literal("SHUTTING_DOWN")
        }),
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
  .use(requestIdPlugin())
  .use(loggerPlugin())
  .use(corsPlugin())
  .use(openApiPlugin())
  .use(root)
  .onError(({ code, error, set, requestId }) => {
    const caught = error as CaughtError;

    // `throw status(401)` carries a numeric `code`; `NotFoundError` has
    // `code: "not-found"` and `status: 404`; request validation has
    // `code: "VALIDATION"` and `status: 422`.
    const numericCode = typeof caught.code === "number" ? caught.code : undefined;
    const libraryStatus = typeof caught.status === "number" ? caught.status : undefined;
    const notFound = code === "NOT_FOUND" || caught.code === "not-found" || libraryStatus === 404;

    // A failed response contract means our own handler returned the wrong
    // shape. Report it as a server error, never as client validation.
    const responseValidation = code === "VALIDATION" && caught.type === "response";

    const status = responseValidation ? 500 : notFound ? 404 : numericCode ?? libraryStatus ?? 500;
    set.status = status;

    if (notFound) return { error: statusError(404) } satisfies ErrorPayload;

    if (responseValidation) {
      if (logging.globalError) appLogger.error({ requestId, error });
      return { error: statusError(500) } satisfies ErrorPayload;
    }

    if (code === "VALIDATION") return { error: statusError(422) } satisfies ErrorPayload;

    if (numericCode !== undefined) {
      // An explicit `throw status(code, body)` is a deliberate client-facing
      // answer, including 503 configuration errors. Unhandled errors never
      // reach this branch and stay behind the generic 500 message.
      const { response } = caught;

      if (typeof response === "string" && response.length > 0) {
        return { error: response } satisfies ErrorPayload;
      }

      if (
        response !== null &&
        typeof response === "object" &&
        "error" in response &&
        typeof response.error === "string"
      ) {
        return { error: response.error } satisfies ErrorPayload;
      }

      return { error: statusError(numericCode) } satisfies ErrorPayload;
    }

    if (status >= 500 && logging.globalError) appLogger.error({ requestId, error });

    return { error: statusError(status) } satisfies ErrorPayload;
  });

export const appService = {
  get: () => app,
  start() {
    if (getEnv().verbose) {
      showRoutes({ routes: app.routes });
    }

    app.listen({ port: getEnv().PORT, hostname: getEnv().HOST ?? "0.0.0.0" });

    appLogger.info(
      `Server is running. Preview at http://${app.server?.hostname}:${app.server?.port}`
    );

    return app;
  }
}