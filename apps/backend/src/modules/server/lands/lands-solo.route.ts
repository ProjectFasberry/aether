import Elysia, { t } from "elysia";
import { defineOptionalUser } from "#/lib/define";
import { getLand, landPayload } from "./lands.model";
import { withData } from "#/shared/schemas";

export const landsSolo = new Elysia()
  .use(defineOptionalUser())
  .get("/:ulid", async ({ nickname: initiator, params: { ulid } }) => {
    const data = await getLand(ulid, { initiator })
    return { data }
  }, {
    params: t.Object({
      ulid: t.String({ min: 3 })
    }),
    response: {
      200: withData(
        landPayload
      )
    }
  })