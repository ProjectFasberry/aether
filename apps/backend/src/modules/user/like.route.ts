import Elysia, { t } from "elysia";
import { defineUser } from "#/lib/middlewares/define";
import { wrapError } from "#/helpers/wrap-error";
import { withData } from "#/shared/schemas";
import { validateBannedStatus } from "#/lib/middlewares/validators";
import { getPlayerLikes, likePlayer } from "./like.model";

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
              created_at: t.Date(),
            })
          ),
          meta: t.Object({
            count: t.Number()
          })
        })
      )
    }
  })

const like = new Elysia()
  .use(defineUser())
  .post("/:nickname", async ({ nickname: initiator, status, params: { nickname: recipient } }) => {
    if (initiator === recipient) {
      throw status(400, wrapError("Dont like yourself"))
    }

    const data = await likePlayer({ initiator, recipient })
    return { data }
  }, {
    response: {
      200: withData(
        t.UnionEnum(["unrated", "rated"])
      ),
      400: t.Object({ error: t.String() })
    }
  })

export const rate = new Elysia()
  .use(validateBannedStatus())
  .group("/rate", app => app
    .use(likes)
    .use(like)
  )