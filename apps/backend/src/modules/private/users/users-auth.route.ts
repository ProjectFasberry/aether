import { validatePermission } from "#/lib/validators";
import { ipPlugin } from "#/lib/plugins/index";
import { register } from "#/modules/auth/register.model";
import { Permissions } from "#/shared/constants/permissions";
import { getNats } from "#/shared/nats/client";
import { registerSchema } from "@repo/shared/schemas/auth";
import Elysia from "elysia";
import * as z from "zod";
import { SUBJECTS } from "#/shared/nats/subjects";

function publishAuth(event: keyof typeof SUBJECTS.EVENTS.AUTHORIZATION, { nickname, created_at }: { nickname: string, created_at?: Date }) {
  const nc = getNats()
  nc.publish(SUBJECTS.EVENTS.AUTHORIZATION[event], JSON.stringify({ nickname, created_at }))
}

const playersAuthReg = new Elysia()
  .use(ipPlugin())
  .post("/register", async ({ ip, body: { nickname, password, hash } }) => {
    const query = await register.create({ nickname, ip, password, hash });
    return { data: query }
  }, {
    body: registerSchema.pick({ nickname: true, password: true, hash: true }),
    afterResponse: ({ responseValue }) => {
      const res = responseValue as { data: { nickname: string, created_at: Date } }
      publishAuth("REGISTER", res.data);
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
      const res = responseValue as { data: { nickname: string } }
      publishAuth("UNREGISTER", res.data);
    }
  })

export const playersAuth = new Elysia()
  .use(validatePermission(Permissions.get("PLAYERS.AUTH")))
  .group("/auth", app => app
    .use(playersAuthReg)
    .use(playersAuthUnreg)
  )