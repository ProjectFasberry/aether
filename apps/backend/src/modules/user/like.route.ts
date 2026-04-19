import Elysia, { t } from "elysia";
import { defineUser } from "#/lib/middlewares/define";
import { wrapError } from "#/helpers/wrap-error";
import { withData } from "#/shared/schemas";
import { validateBannedStatus } from "#/lib/middlewares/validators";
import { getPlayerLikes, likePlayer } from "./like.model";

const likes = new Elysia()
  .model({
    "like": withData(
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
  })
  .get("/list/:nickname", async ({ params }) => {
    const nickname = params.nickname;
    const data = await getPlayerLikes(nickname)
    return { data }
  }, {
    response: {
      200: "like"
    }
  })

const like = new Elysia()
  .use(defineUser())
  .model({
    "post-like": withData(
      t.UnionEnum(["unrated", "rated"])
    )
  })
  .post("/:nickname", async ({ nickname: initiator, status, params: { nickname: recipient } }) => {
    if (initiator === recipient) {
      return status(400, wrapError("Dont like yourself"))
    }

    const data = await likePlayer({ initiator, recipient })

    return { data }
  }, {
    response: {
      200: "post-like",
      400: t.Object({ error: t.String() })
    }
  })

export const rate = new Elysia()
  .use(validateBannedStatus())
  .group("/rate", app => app
    .use(likes)
    .use(like)
  )