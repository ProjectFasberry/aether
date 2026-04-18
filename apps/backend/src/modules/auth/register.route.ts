import Elysia, { t } from "elysia";
import { createUser, getExistsUser, validateIpRestricts, validatePasswordSafe } from "./auth.model";
import { wrapError } from "#/helpers/wrap-error";
import { HttpStatusEnum } from "elysia-http-status-code/status";
import { general } from "#/shared/database/general-db";
import { botValidator, validateAuthStatus } from "#/lib/middlewares/validators";
import { withData, withError } from "#/shared/schemas";
import { registerSchema } from "@repo/shared/schemas/auth"
import { ipPlugin } from "#/lib/plugins/ip";

const registerValidator = () => new Elysia()
  .onBeforeHandle(async ({ status }) => {
    const query = await general
      .selectFrom("options")
      .select("value")
      .where("name", "=", "registrationEnabled")
      .executeTakeFirst()

    const isEnabled = Boolean(query?.value)
    if (!isEnabled) throw status(HttpStatusEnum.HTTP_400_BAD_REQUEST, "authorization-disabled")
  })
  .as("scoped")

const ipValidator = () => new Elysia()
  .use(ipPlugin())
  .onBeforeHandle(async ({ ip, status }) => {
    const isValid = await validateIpRestricts(ip)
    if (isValid) throw status(HttpStatusEnum.HTTP_400_BAD_REQUEST, wrapError("ip-limit"))
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
      const existsUser = await getExistsUser(nickname)
      if (existsUser.result) throw status(HttpStatusEnum.HTTP_400_BAD_REQUEST, wrapError("exists"))

      const passIsSafe = validatePasswordSafe(inputPass)
      if (!passIsSafe) throw status(HttpStatusEnum.HTTP_400_BAD_REQUEST, wrapError("unsafe"))

      const hash = Bun.password.hashSync(inputPass, {
        algorithm: "bcrypt", cost: 10
      })

      const data = await createUser({
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