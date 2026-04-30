import Elysia, { t } from "elysia";
import { auth } from "./auth.model";
import { wrapError } from "#/helpers/wrap-error";
import { general } from "#/shared/database/general-db";
import { botValidator, validateAuthStatus } from "#/lib/middlewares/validators";
import { withData, withError } from "#/shared/schemas";
import { registerSchema } from "@repo/shared/schemas/auth"
import { ipPlugin } from "#/lib/plugins/index";
import { register } from "./register.model"

const registerValidator = () => new Elysia()
  .onBeforeHandle(async ({ status }) => {
    const query = await general
      .selectFrom("options")
      .select("value")
      .where("name", "=", "registrationEnabled")
      .executeTakeFirst()

    const isEnabled = Boolean(query?.value)
    if (!isEnabled) throw status(400, "AUTHORIZATION_DISABLED")
  })
  .as("scoped")

const ipValidator = () => new Elysia()
  .use(ipPlugin())
  .onBeforeHandle(async ({ ip, status }) => {
    const isValid = await register.validateIpRestricts(ip)
    if (isValid) throw status(400, wrapError("IP_RESTRICTIONS"))
  })
  .as("scoped")

export const registerRoute = new Elysia()
  .group("/register", app => app
    .use(botValidator())
    .use(registerValidator())
    .use(validateAuthStatus())
    .use(ipValidator())
    .post("/", async ({ status, body: { findout, hash, nickname, password: inputPass, findoutType }, ip }) => {
      const existsUser = await auth.getExistsUser(nickname)
      if (existsUser.result) {
        throw status(400, wrapError("USER_EXISTS"))
      }

      const passIsSafe = auth.validatePasswordSafe(inputPass)
      if (!passIsSafe) {
        throw status(400, wrapError("PASSWORD_IS_UNSAFE"))
      }

      const passHash = Bun.password.hashSync(inputPass, {
        algorithm: "bcrypt", cost: 10
      })

      const data = await register.createUser({
        nickname, findout, findoutType, password: passHash, ip, hash
      })

      return { data }
    }, {
      body: registerSchema,
      response: {
        200: withData(
          t.Object({
            nickname: t.String()
          })
        ),
        400: withError(
          t.UnionEnum([
            "USER_EXISTS",
            "PASSWORD_IS_UNSAFE",
            "AUTHORIZATION_DISABLED",
            "IP_RESTRICTIONS"
          ])
        ),
        500: withError()
      }
    })
  )