import Elysia, { t } from "elysia";
import { defineOptionalUser } from "#/lib/middlewares/define";
import { getLand } from "./lands.model";

export const landsSolo = new Elysia()
  .use(defineOptionalUser())
  .get("/:ulid", async ({ nickname: initiator, params: { ulid } }) => {
    const data = await getLand(ulid, { initiator })
    return { data }
  }, {
    params: t.Object({
      ulid: t.String({ min: 3 })
    })
  })