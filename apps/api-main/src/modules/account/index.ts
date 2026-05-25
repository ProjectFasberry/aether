import { defineRequiredUser } from "#/lib/define";
import { withData, withError } from "#/shared/schemas";
import Elysia, { t } from "elysia";
import { changePassword, changePasswordSchema, deleteAccount } from "./account.model";
import { ipPlugin } from "#/lib/plugins";

export const account = new Elysia()
  .use(defineRequiredUser())
  .use(ipPlugin())
  .group("/account", app => app
    .delete("/", async ({ nickname, ip, status }) => {
      const result = await deleteAccount({ nickname, ip })
      return { data: "OK" }
    }, {
      response: {
        200: withData(
          t.Literal("OK")
        ),
        500: withError()
      }
    })
    .patch("/password", async ({ nickname, ip, body: { currentPass, newPass }, status }) => {
      const result = await changePassword({ nickname, ip, newPass, currentPass });
      return { data: "OK" }
    }, {
      body: changePasswordSchema,
      response: {
        200: withData(
          t.Literal("OK")
        ),
        500: withError()
      }
    })
  )
