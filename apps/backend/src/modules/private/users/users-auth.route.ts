import { validatePermission } from "#/lib/middlewares/validators";
import { ipPlugin } from "#/lib/plugins/ip";
import { register } from "#/modules/auth/register.model";
import { Permissions } from "#/shared/constants/permissions";
import { getNats } from "#/shared/nats/client";
import { nicknameSchema, passwordSchema } from "@repo/shared/schemas/auth";
import Elysia from "elysia";
import z from "zod";

function publishAuth(event: string, { nickname, created_at }: { nickname: string, created_at?: Date }) {
  const nc = getNats()
  nc.publish(`events.authorization.${event}`, JSON.stringify({ nickname, created_at }))
}

const playersAuthReg = new Elysia()
  .use(ipPlugin())
  .post("/register", async ({ ip, body: { nickname, password, mnHex } }) => {
    const query = await register.create({ nickname, ip, password, mnHex });
    return { data: query }
  }, {
    body: z.object({
      nickname: nicknameSchema,
      password: passwordSchema
    }),
    afterResponse: ({ responseValue }) => {
      const res = responseValue as { data: { nickname: string, created_at: Date }}
      publishAuth("register", res.data);
    }
  })

const playersAuthUnreg = new Elysia()
  .post("/unregister", async ({ body: { nickname, strict } }) => {
    const query = await register.unregister({ nickname, strict });
    return { data: query }
  }, {
    body: z.object({
      nickname: nicknameSchema,
      strict: z.stringbool().or(z.boolean()).default(false)
    }),
    afterResponse: ({ responseValue }) => {
      const res = responseValue as { data: { nickname: string } }
      publishAuth("unregister", res.data);
    }
  })

export const playersAuth = new Elysia()
  .use(validatePermission(Permissions.get("PLAYERS.AUTH")))
  .group("/auth", app => app
    .use(playersAuthReg)
    .use(playersAuthUnreg)
  )