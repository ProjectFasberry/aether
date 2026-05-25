import Elysia, { t } from "elysia";
import { getSkin, getSkinsHistory, setSkin, skinsHistorySchema } from "./skin.model";
import { defineRequiredUser } from '#/lib/define';
import { skinUpload as upload } from './skin-upload.route';
import { withData, withError } from "#/shared/schemas";
import { wrapError } from "@repo/shared/lib/utils";

const history = new Elysia()
  .get("/history/:nickname", async ({ params: { nickname } }) => {
    const data = await getSkinsHistory({ nickname })
    return { data }
  }, {
    response: {
      200: withData(t.Nullable(skinsHistorySchema))
    }
  })

const set = new Elysia()
  .use(defineRequiredUser())
  .get("/set", async ({ query, nickname, status }) => {
    const result = await setSkin(nickname, query.id)
    if (!result) throw status(500, wrapError("THIRDPARTY_ERROR"))

    return { data: "OK" }
  }, {
    query: t.Object({
      id: t.String({ minLength: 1 })
    }),
    response: {
      200: withData(t.Literal("OK")),
      400: withError(),
      500: withError(
        t.UnionEnum([
          "THIRDPARTY_ERROR",
          "INTERNAL_SERVER_ERROR"
        ])
      )
    }
  })

const download = new Elysia()
  .get('/download/:nickname', async ({ set, params: { nickname } }) => {
    const skin = await getSkin(nickname)

    set.headers["content-type"] = 'image/png'
    set.headers['content-disposition'] = `attachment; filename=${nickname}-skin.png`

    return skin
  });

export const skinGroup = new Elysia()
  .group("/skin", app => app
    .use(upload)
    .use(download)
    .use(set)
    .use(history)
  )