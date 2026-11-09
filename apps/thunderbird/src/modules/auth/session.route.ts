import { defineRequiredSession } from "#/lib/define";
import Elysia, { type SelectiveStatus, t } from "elysia";
import {
  sessionParsedPayloadSchema,
  session as sessionService,
  sessions,
  sessionsParsedPayloadSchema,
} from "./login.model";
import { withData, withError } from "#/shared/schemas";
import { buildRouteSummary } from "#/utils";
import { isError } from "@repo/shared/utils";
import { wrapError } from "@repo/shared/lib/helpers"

const SESSION_ERRORS_MAP = {
  INSUFFICIENT_PERMISSION_BY_TIME: 400,
  INSUFFICIENT_PERMISSION_BY_EXISTANCE: 400,
  CANNOT_DELETE_CURRENT: 400,
} as const;

type ErrorKeys = keyof typeof SESSION_ERRORS_MAP;

const SESSION_ERRORS = Object.keys(SESSION_ERRORS_MAP) as [ErrorKeys, ...ErrorKeys[]];

function defineError(e: Error | unknown, status: SelectiveStatus<any>) {
  if (isError(e)) {
    const message = e.message as ErrorKeys;
    const target = SESSION_ERRORS_MAP[message];
    if (target) throw status(target, wrapError(message));

    throw status(500, wrapError("UNKNOWN"));
  }

  throw status(500, wrapError("UNKNOWN"));
}

export const session = new Elysia()
  .use(defineRequiredSession())
  .group("/session", app => app
    .get("/list", async ({ nickname }) => {
      const data = await sessions.get(nickname);
      return { data };
    }, {
      response: {
        200: withData(sessionsParsedPayloadSchema),
      },
      detail: {
        summary: buildRouteSummary("Get session list"),
      },
    })
    .get("/current", async ({ session: sessionToken, nickname }) => {
      const data = await sessionService.get({ nickname, sessionToken });
      return { data };
    }, {
      response: {
        200: withData(sessionParsedPayloadSchema),
      },
      detail: {
        summary: buildRouteSummary("Get current session"),
      },
    })
    .delete("/all", async ({ session: sessionToken, nickname, status }) => {
      try {
        await sessions.delete({ nickname, sessionToken });
        return { data: "OK" };
      } catch (e) {
        defineError(e, status);
      }
    }, {
      response: {
        200: withData(t.Literal("OK")),
        500: withError(),
        400: withError(t.UnionEnum(SESSION_ERRORS)),
      },
      detail: {
        summary: buildRouteSummary("Delete all sessions"),
      },
    })
    .delete("/:id", async ({ params: { id }, nickname, session: sessionToken, status }) => {
      try {
        await sessions.deleteById({ nickname, targetId: id, sessionToken });
        return { data: "OK" };
      } catch (e) {
        defineError(e, status);
      }
    }, {
      params: t.Object({
        /** sha256 of the session token: 64 hex chars, but keep it loose. */
        id: t.String({ minLength: 16, maxLength: 128 }),
      }),
      response: {
        200: withData(t.Literal("OK")),
        500: withError(),
        400: withError(t.UnionEnum(SESSION_ERRORS)),
      },
      detail: {
        summary: buildRouteSummary("Delete session by id"),
      },
    },
    ),
  );
