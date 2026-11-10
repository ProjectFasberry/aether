import { getEnv } from "./shared/env";
import { Elysia, type ElysiaConfig, type ValidationError } from "elysia";
import { serverTiming as serverTimingPlugin } from "@elysia/server-timing";
import { openApiPlugin } from "./lib/plugins/openapi";
import { defineOptionalSession } from "./lib/define";
import { session } from "./modules/auth/login.model";
import { appLogger } from "./shared/constants/logger";
import { main, root } from "./routes";
import { corsPlugin, ipPlugin, isAllowedOrigin, loggerPlugin, requestIdPlugin } from "./lib/plugins";
import { publicRateLimit } from "./lib/plugins/public-rate-limit";
import { SESSION_KEY } from "./modules/auth/cookie";
import { logging } from "./shared/constants";
import { safeJsonParse } from "./utils";
import { showRoutes } from "@repo/shared/lib/helpers";
import { areRequiredDatabasesHealthy } from "./shared/database/health";

/** Only stable contract codes leave the API; SQL/driver text stays in logs. */
const SAFE_ERROR_CODE = /^[A-Z][A-Z0-9_]*$/;

const appConfig: ElysiaConfig<string> = {
  serve: {
    hostname: "0.0.0.0",
  },
  aot: true,
};

const app = new Elysia(appConfig)
  .use(requestIdPlugin())
  .use(openApiPlugin())
  .use(serverTimingPlugin())
  .use(ipPlugin())
  .use(publicRateLimit())
  .use(corsPlugin())
  .onBeforeHandle(({ request, status }) => {
    const path = new URL(request.url).pathname;

    // Health and OpenAPI stay available for diagnostics while the API drains.
    if (path.startsWith("/health") || path.startsWith("/openapi")) return;

    if (!areRequiredDatabasesHealthy()) {
      throw status(503, { error: "DB_UNAVAILABLE" });
    }
  })
  // A cross-site request still reaches the server even when CORS blocks the
  // response, so cookie-authenticated mutations need an explicit origin check.
  .onBeforeHandle(({ request, cookie, status }) => {
    const method = request.method.toUpperCase();
    if (method === "GET" || method === "HEAD" || method === "OPTIONS") return;

    const sessionCookie = cookie[SESSION_KEY]?.value;
    // Bearer clients (launcher, scripts) are not CSRF-able.
    if (!sessionCookie) return;

    const origin = request.headers.get("origin");
    if (!origin) return;

    if (!isAllowedOrigin(origin)) {
      throw status(403, { error: "FORBIDDEN" });
    }
  })
  .use(loggerPlugin())
  .onError((payload) => {
    const { error, code, set, requestId } = payload;

    if (logging.globalError) {
      appLogger.error({
        requestId,
        code,
        name: error instanceof Error ? error.name : typeof error,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      })
    };

    // `throw status(400, ...)` produces ElysiaCustomStatusResponse, which carries
    // the numeric code on `error.code`. Returning a body from onError does not
    // preserve it, so the response status must be set explicitly.
    const customStatus = (error as { code?: unknown }).code;
    if (typeof customStatus === "number") {
      set.status = customStatus;
    }

    let message: string | ValidationError = "INTERNAL_SERVER_ERROR";

    if (code === "VALIDATION") {
      const result = safeJsonParse<ValidationError>(error.message);
      message = result.ok ? result.value : error.message;
      return { error: message };
    }

    if (code === "NOT_FOUND") return { error: code };
    if (code === "PARSE") return { error: "BAD_REQUEST" };

    if ("response" in error) {
      const res = error.response as { error?: string } | number;

      if (typeof res === "object" && res !== null) {
        if (res.error) {
          message = res.error;
        }
      } else {
        message = String(res);
      }
    }

    if (error instanceof Error) {
      if (SAFE_ERROR_CODE.test(error.message)) return { error: error.message };

      return { error: "INTERNAL_SERVER_ERROR" };
    }

    return { error: message };
  })
  .use(root)
  .use(defineOptionalSession())
  .onBeforeHandle(async (ctx) => session.updateSession(ctx.session, ctx.cookie))
  .use(main);

export const appService = {
  start() {
    if (getEnv().verbose) {
      showRoutes({ routes: app.routes });
    }

    app.listen({ port: getEnv().PORT, hostname: getEnv().HOST });

    appLogger.child({ name: "server" }).info(
      `Server is running. Preview at http://${app.server?.hostname}:${app.server?.port}`
    );

    return app;
  },
}

export type App = typeof app;
