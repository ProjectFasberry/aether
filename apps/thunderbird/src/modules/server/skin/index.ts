import Elysia, { t } from "elysia";
import { defineRequiredUser } from '#/lib/define';
import { skinUpload as upload } from './skin-upload.route';
import { withData, withError } from "#/shared/schemas";
import { wrapError } from "@repo/shared/lib/helpers";
import { skinsHistorySchema } from "@repo/core/modules/skins/index"
import { skinsService } from "../../../shared/services/skins";
import { buildRouteSummary } from "#/utils";
import { minioService } from "#/shared/services/minio";

const history = new Elysia()
  .get("/history/:nickname", async ({ params: { nickname } }) => {
    const data = await skinsService.skin.getCachedSkinsPayload(nickname)
    return { data }
  }, {
    response: {
      200: withData(t.Nullable(skinsHistorySchema))
    },
    detail: {
      summary: buildRouteSummary("Get skin history")
    }
  })

const set = new Elysia()
  .use(defineRequiredUser())
  .get("/set", async ({ query, nickname, status }) => {
    const result = await skinsService.skin.setSkin(nickname, query.id, minioService.getInstance)
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
    },
    detail: {
      summary: buildRouteSummary("Set skin")
    }
  })

const download = new Elysia()
  .get('/download/:nickname', async ({ set, params: { nickname } }) => {
    const skin = await skinsService.skin.getSkin(nickname)

    set.headers["content-type"] = 'image/png'
    set.headers['content-disposition'] = `attachment; filename=${nickname}-skin.png`

    return skin
  }, {
    detail: {
      summary: buildRouteSummary("Download skin")
    }
  });

export const skinGroup = new Elysia()
  .group("/skin", app => app
    .use(upload)
    .use(download)
    .use(set)
    .use(history)
  )
