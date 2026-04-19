import Elysia, { t } from "elysia";
import { auth } from "./auth.model";
import { wrapError } from "#/helpers/wrap-error";
import { general } from "#/shared/database/general-db";
import { botValidator, validateAuthStatus } from "#/lib/middlewares/validators";
import { withData, withError } from "#/shared/schemas";
import { registerSchema } from "@repo/shared/schemas/auth"
import { ipPlugin } from "#/lib/plugins/ip";
import { register as registerService } from "./register.model"

const registerValidator = () => new Elysia()
  .onBeforeHandle(async ({ status }) => {
    const query = await general
      .selectFrom("options")
      .select("value")
      .where("name", "=", "registrationEnabled")
      .executeTakeFirst()

    const isEnabled = Boolean(query?.value)
    if (!isEnabled) throw status(400, "authorization-disabled")
  })
  .as("scoped")

const ipValidator = () => new Elysia()
  .use(ipPlugin())
  .onBeforeHandle(async ({ ip, status }) => {
    const isValid = await registerService.validateIpRestricts(ip)
    if (isValid) throw status(400, wrapError("ip-limit"))
  })
  .as("scoped")

export const register = new Elysia()
  .group("/register", app => app
    .use(botValidator())
    .use(registerValidator())
    .use(validateAuthStatus())
    .use(ipValidator())
    .model({
      "register": withData(t.Object({ nickname: t.String() }))
    })
    .post("/", async ({ status, body: { findout, mnHex, nickname, password: inputPass, findoutType }, ip }) => {
      const existsUser = await auth.getExistsUser(nickname)
      if (existsUser.result) throw status(400, wrapError("exists"))

      const passIsSafe = auth.validatePasswordSafe(inputPass)
      if (!passIsSafe) throw status(400, wrapError("unsafe"))

      const hash = Bun.password.hashSync(inputPass, {
        algorithm: "bcrypt", cost: 10
      })

      const data = await registerService.createUser({
        nickname, findout, findoutType, password: hash, ip, mnHex
      })

      return { data }
    }, {
      body: registerSchema,
      response: {
        200: "register",
        409: withError,
        400: withError,
      }
    })
  )