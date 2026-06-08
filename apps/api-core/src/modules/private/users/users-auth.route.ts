import { validatePermission } from "#/lib/validators";
import { ipPlugin } from "#/lib/plugins/index";
import { register } from "#/modules/auth/register.model";
import { permissions } from "#/shared/constants/permissions";
import { nats } from "#/shared/nats/client";
import { registerSchema } from "@repo/shared/schemas/auth";
import Elysia, { t } from "elysia";
import * as z from "zod";
import { SUBJECTS } from "#/shared/nats/subjects";
import { withData } from "#/shared/schemas";
import { buildRouteSummary } from "#/utils";

function publishAuth(event: keyof typeof SUBJECTS.EVENTS.AUTHORIZATION, { nickname, created_at }: { nickname: string, created_at?: Date }) {
  const nc = nats.getInstance()
  nc.publish(SUBJECTS.EVENTS.AUTHORIZATION[event], JSON.stringify({ nickname, created_at }))
}
const getWrappedData = <T>(value?: any): T | null => value ? value?.data ?? null : null;

const playersAuthReg = new Elysia()
  .use(ipPlugin())
  .post("/register", async ({ ip, body: { nickname, password, hash } }) => {
    const query = await register.create({ nickname, ip, password, hash });
    return { data: query }
  }, {
    body: registerSchema.pick({
      nickname: true, password: true, hash: true
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
          created_at: t.String()
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
  .use(validatePermission(permissions.get("PLAYERS.AUTH")))
  .group("/auth", app => app
    .use(playersAuthReg)
    .use(playersAuthUnreg)
  )
