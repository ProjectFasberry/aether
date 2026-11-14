import Elysia, { t } from "elysia";
import { defineRequiredUser } from '#/lib/define';
import { skinUpload as upload } from './skin-upload.route';
import { withData, withError } from "#/shared/schemas";
import { wrapError } from "@repo/shared/lib/helpers";
import { skinsHistorySchema } from "@repo/core/modules/skins/index"
import { skinsService } from "../../../shared/services/skins";
import { buildRouteSummary } from "#/lib/routes";
import { minioService } from "#/shared/services/minio";

const skinNameSchema = t.String({ minLength: 1, maxLength: 36 })

const setSkinResponses = {
  200: withData(t.Literal("OK")),
  403: withError(t.UnionEnum(["SKIN_FORBIDDEN"])),
  404: withError(t.UnionEnum(["SKIN_NOT_FOUND", "PLAYER_NOT_FOUND"])),
  500: withError(t.UnionEnum(["INTERNAL_SERVER_ERROR"]))
}

const history = new Elysia()
  .get("/history/:nickname", async ({ params: { nickname } }) => {
    const data = await skinsService.skin.getSkinsPayload(nickname, minioService.getInstance)
    return { data }
  }, {
    response: {
      200: withData(t.Nullable(skinsHistorySchema))
    },
    detail: {
      summary: buildRouteSummary("Get skin history")
    }
  })

const current = new Elysia()
  .use(defineRequiredUser())
  .put("/current", async ({ body: { skinName }, nickname, status }) => {
    try {
      const result = await skinsService.skin.setSkin(nickname, skinName, minioService.getInstance)

      if (!result.ok) {
        return status(result.error === "SKIN_FORBIDDEN" ? 403 : 404, wrapError(result.error))
      }

      return { data: "OK" as const }
    } catch {
      return status(500, wrapError("INTERNAL_SERVER_ERROR"))
    }
  }, {
    body: t.Object({
      skinName: skinNameSchema,
    }),
    response: setSkinResponses,
    detail: {
      summary: buildRouteSummary("Set current skin")
    }
  })

/**
 * @deprecated Replaced by `PUT /server/skin/current`; kept for one release so
 * the panel and older clients can roll out independently.
 */
const set = new Elysia()
  .use(defineRequiredUser())
  .get("/set", async ({ query, nickname, status }) => {
    try {
      const result = await skinsService.skin.setSkin(nickname, query.id, minioService.getInstance)

      if (!result.ok) {
        return status(result.error === "SKIN_FORBIDDEN" ? 403 : 404, wrapError(result.error))
      }

      return { data: "OK" as const }
    } catch {
      return status(500, wrapError("INTERNAL_SERVER_ERROR"))
    }
  }, {
    query: t.Object({
      id: skinNameSchema,
    }),
    response: setSkinResponses,
    detail: {
      summary: buildRouteSummary("Set skin (deprecated)"),
      deprecated: true,
    }
  })

const download = new Elysia()
  .get('/download/:nickname', async ({ set, params: { nickname }, status }) => {
    const skin = await skinsService.skin.getSkin(nickname)

    // Texture URLs are public; redirect instead of proxying the image through
    // the API. The fallback is a full skin, not a head.
    if (!/^https?:\/\//i.test(skin)) return status(404, wrapError("NOT_FOUND"))

    set.status = 302
    set.headers["location"] = skin
    set.headers["cache-control"] = "public, max-age=300"

    return ""
  }, {
    response: {
      404: withError(t.UnionEnum(["NOT_FOUND"])),
    },
    detail: {
      summary: buildRouteSummary("Download skin")
    }
  });

export const skinGroup = new Elysia()
  .group("/skin", app => app
    .use(upload)
    .use(download)
    .use(set)
    .use(current)
    .use(history)
  )
