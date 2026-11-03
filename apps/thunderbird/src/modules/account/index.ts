import { defineRequiredUser } from "#/lib/define";
import { withData, withError } from "#/shared/schemas";
import Elysia, { t } from "elysia";
import { changePassword, changePasswordSchema, deleteAccount } from "./account.model";
import { ipPlugin } from "#/lib/plugins";
import { buildRouteSummary } from "#/utils";
import { wrapError } from "@repo/shared/lib/helpers";

export const account = new Elysia()
  .use(defineRequiredUser())
  .use(ipPlugin())
  .group("/account", app => app
    .delete("/", async ({ nickname, ip, status }) => {
      const result = await deleteAccount({ nickname, ip });

      if (!result.ok) return status(404, wrapError(result.error));

      return { data: "OK" };
    }, {
      response: {
        200: withData(t.Literal("OK")),
        404: withError(t.UnionEnum(["NOT_FOUND"])),
        500: withError(),
      },
      detail: {
        summary: buildRouteSummary("Delete account"),
      },
    })
    .patch("/password", async ({ nickname, ip, body: { currentPass, newPass }, status }) => {
      const result = await changePassword({ nickname, ip, newPass, currentPass });

      if (!result.ok) {
        return status(result.error === "NOT_FOUND" ? 404 : 400, wrapError(result.error));
      }

      return { data: "OK" };
    }, {
      body: changePasswordSchema,
      response: {
        200: withData(t.Literal("OK")),
        400: withError(t.UnionEnum(["PASSWORD_OR_LOGIN_INCORRECT", "PASSWORD_IS_UNSAFE"])),
        404: withError(t.UnionEnum(["NOT_FOUND"])),
        500: withError(),
      },
      detail: {
        summary: buildRouteSummary("Change password"),
      },
    },
    )
  );
