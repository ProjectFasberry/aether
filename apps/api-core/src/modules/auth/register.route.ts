import Elysia, { t } from "elysia";
import { auth } from "./auth.model";
import { buildRouteSummary, wrapError } from "#/utils";
import { botValidator, validateAuthStatus } from "#/lib/validators";
import { withData, withError } from "#/shared/schemas";
import { registerSchema } from "@repo/shared/schemas/auth"
import { ipPlugin } from "#/lib/plugins/index";
import { register } from "./register.model"
import { isProduction } from "#/shared/env";
import { getOption } from "#/shared/constants/options";

const registerValidator = () => new Elysia()
  .onBeforeHandle(async ({ status }) => {
    const isEnabled = await getOption("registrationEnabled")
    if (!isEnabled) throw status(400, "AUTHORIZATION_DISABLED")
  })
  .as("scoped")

const ipValidator = () => new Elysia()
  .use(ipPlugin())
  .onBeforeHandle(async ({ ip, status }) => {
    if (isProduction) {
      const isValid = await register.validateIpRestricts(ip)
      if (isValid) {
        throw status(400, wrapError("IP_RESTRICTIONS"))
      }
    }
  })
  .as("scoped")

export const registerRoute = new Elysia()
  .group("/register", app => app
    .use(botValidator())
    .use(registerValidator())
    .use(validateAuthStatus())
    .use(ipValidator())
    .post("/", async ({ status, body: { findout, hash: phraseHash, nickname, password: passInputPass, findoutType }, ip }) => {
      const existsUser = await auth.getExistsUser(nickname)
      if (existsUser.result) {
        throw status(400, wrapError("USER_EXISTS"))
      }

      const passIsSafe = auth.validatePasswordSafe(passInputPass)
      if (!passIsSafe) {
        throw status(400, wrapError("PASSWORD_IS_UNSAFE"))
      }

      const passHash = Bun.password.hashSync(passInputPass, {
        algorithm: "bcrypt", cost: 10
      })

      const seedHash = Bun.password.hashSync(phraseHash, {
        algorithm: "bcrypt", cost: 10
      })

      const data = await register.createUser({
        nickname, findout, findoutType, password: passHash, ip, hash: seedHash
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
      },
      detail: {
        summary: buildRouteSummary("Register")
      },
    })
  )
