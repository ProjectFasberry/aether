import { defineRequiredSession } from "#/lib/define";
import Elysia, { type SelectiveStatus, t } from "elysia";
import { sessionParsedPayloadSchema, session as sessionService, sessions, sessionsParsedPayloadSchema } from "./login.model";
import { withData, withError } from "#/shared/schemas";
import { wrapError } from "#/utils";
import { isError } from "@repo/shared/lib/helpers"

const SESSION_ERRORS_MAP = {
  "INSUFFICIENT_PERMISSION_BY_TIME": 400,
  "INSUFFICIENT_PERMISSION_BY_EXISTANCE": 400
} as const;

type ErrorKeys = keyof typeof SESSION_ERRORS_MAP;

const SESSION_ERRORS = Object.keys(SESSION_ERRORS_MAP) as unknown as readonly [
  ErrorKeys,
  ...ErrorKeys[]
];

function defineError(e: Error | unknown, status: SelectiveStatus<any>) {
  if (isError(e)) {
    const message = e.message as ErrorKeys
    const target = SESSION_ERRORS_MAP[message];

    if (target) {
      throw status(target, wrapError(message))
    }

    throw new Error("Unexpected error")
  }
}

export const session = new Elysia()
  .use(defineRequiredSession())
  .group("/session", (app) => app
    .get("/list", async ({ nickname }) => {
      const data = await sessions.get(nickname);
      return { data };
    }, {
      response: {
        200: withData(sessionsParsedPayloadSchema)
      }
    })
    .get("/current", async ({ session: sessionToken, nickname }) => {
      const data = await sessionService.get({ nickname, sessionToken })
      return { data };
    }, {
      response: {
        200: withData(sessionParsedPayloadSchema)
      }
    })
    .delete("/all", async ({ session: sessionToken, nickname, status }) => {
      try {
        await sessions.delete({ nickname, sessionToken });
        return { data: "OK" }
      } catch (e) {
        defineError(e, status)
      }
    }, {
      response: {
        200: withData(
          t.Literal("OK")
        ),
        500: withError(),
        400: withError(
          t.UnionEnum(SESSION_ERRORS)
        )
      }
    })
    .delete("/:id", async ({ params: { id }, nickname, session: sessionToken, status }) => {
      try {
        await sessions.deleteById({ nickname, targetToken: id, sessionToken })
        return { data: "OK" }
      } catch (e) {
        defineError(e, status)
      }
    }, {
      params: t.Object({
        id: t.String({ minLength: 6 })
      }),
      response: {
        200: withData(
          t.Literal("OK")
        ),
        500: withError(),
        400: withError(
          t.UnionEnum(SESSION_ERRORS)
        )
      }
    })
  );
