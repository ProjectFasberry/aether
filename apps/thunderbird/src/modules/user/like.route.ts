import Elysia, { t } from "elysia";
import { defineRequiredUser } from "#/lib/define";
import { buildRouteSummary } from "#/utils";
import { withData } from "#/shared/schemas";
import { validateBannedStatus } from "#/lib/validators";
import { getPlayerLikes, ratePlayer } from "./like.model";
import { DateTime } from "#/helpers/typebox";
import { wrapError } from "@repo/shared/lib/helpers"

const likes = new Elysia()
  .get("/list/:nickname", async ({ params: { nickname } }) => {
    const data = await getPlayerLikes(nickname)
    return { data }
  }, {
    response: {
      200: withData(
        t.Object({
          data: t.Array(
            t.Object({
              initiator: t.String(),
              created_at: DateTime,
              avatar: t.String()
            })
          ),
          meta: t.Object({
            count: t.Number()
          })
        })
      )
    },
    detail: {
      summary: buildRouteSummary("Get player likes")
    },
  })

const like = new Elysia()
  .use(defineRequiredUser())
  .post("/:nickname", async ({ nickname: initiator, status, params: { nickname: recipient } }) => {
    if (initiator === recipient) {
      throw status(400, wrapError("INVALID_REQUEST"))
    }

    const data = await ratePlayer({ initiator, recipient })
    return { data }
  }, {
    response: {
      200: withData(
        t.UnionEnum(["unrated", "rated"])
      ),
      400: t.Object({ error: t.String() })
    },
    detail: {
      summary: buildRouteSummary("Rate player")
    },
  })

export const rate = new Elysia()
  .use(validateBannedStatus())
  .group("/rate", app => app
    .use(likes)
    .use(like)
  )
