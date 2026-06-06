import { validatePermission } from "#/lib/validators"
import { Permissions } from "#/shared/constants/permissions"
import { withData } from "#/shared/schemas";
import Elysia, { t } from "elysia"
import { getOptions } from "./options.model";

export const optionsList = new Elysia()
  .use(validatePermission(Permissions.get("OPTIONS.READ")))
  .get("/list", async () => {
    const data = await getOptions()
    return { data }
  }, {
    response: {
      200: withData(
        t.Array(
          t.Object({
            name: t.String(),
            value: t.Boolean(),
            title: t.String()
          })
        )
      )
    }
  })
