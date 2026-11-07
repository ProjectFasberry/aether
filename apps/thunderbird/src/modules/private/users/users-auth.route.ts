import { validatePermission } from "#/lib/validators";
import { ipPlugin } from "#/lib/plugins/index";
import { register } from "#/modules/auth/register.model";
import { permissionsService } from "#/shared/constants/permissions";
import { natsService } from "#/shared/nats/client";
import { registerSchema } from "@repo/shared/schemas/auth";
import Elysia, { t } from "elysia";
import * as z from "zod";
import { SUBJECTS } from "#/shared/nats/subjects";
import { withData } from "#/shared/schemas";
import { buildRouteSummary } from "#/utils";
import { DateTime } from "#/helpers/typebox";

function publishAuth(event: keyof typeof SUBJECTS.EVENTS.AUTHORIZATION, { nickname, created_at }: { nickname: string, created_at?: Date }) {
  const nc = natsService.getInstance()
  nc.publish(SUBJECTS.EVENTS.AUTHORIZATION[event], JSON.stringify({ nickname, created_at }))
}
const getWrappedData = <T>(value?: unknown): T | null => {
  if (!value || typeof value !== "object") return null;

  return (value as { data?: T }).data ?? null;
};

const playersAuthReg = new Elysia()
  .use(ipPlugin())
  .post("/register", async ({ ip, body: { nickname, password } }) => {
    const data = await register.create({
      nickname, ip, password
    });

    return { data }
  }, {
    body: registerSchema.pick({
      nickname: true, password: true
    }),
    afterResponse: ({ responseValue }) => {
      const res = getWrappedData<{ nickname: string, created_at: Date }>(responseValue)
      if (!res) return;
      publishAuth("REGISTER", res);
    },
    response: {
      200: withData(
        t.Object({
          nickname: t.String(),
          created_at: DateTime
        })
      )
    },
    detail: {
      summary: buildRouteSummary("Register player")
    }
  })

const playersAuthUnreg = new Elysia()
  .post("/unregister", async ({ body: { nickname, strict } }) => {
    const query = await register.unregister({ nickname, isStrict: strict });
    return { data: query }
  }, {
    body: z.intersection(
      registerSchema.pick({ nickname: true }),
      z.object({
        strict: z.stringbool().or(z.boolean()).default(false)
      })
    ),
    afterResponse: ({ responseValue }) => {
      const res = getWrappedData<{ nickname: string }>(responseValue)
      if (!res) return;
      publishAuth("UNREGISTER", res);
    },
    response: {
      200: withData(
        t.Object({
          nickname: t.String()
        })
      )
    },
    detail: {
      summary: buildRouteSummary("Unregister player")
    }
  })

export const playersAuth = new Elysia()
  .use(validatePermission(permissionsService.get("PLAYERS.AUTH"), { withExternal: true }))
  .group("/auth", app => app
    .use(playersAuthReg)
    .use(playersAuthUnreg)
  )
