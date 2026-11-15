import Elysia, { t } from "elysia"
import { defineRequiredUser } from "#/lib/define"
import {
  InvalidSkinFileError,
  RateLimitedError,
  upload,
  uploadBodySchema,
} from "./skin.model"
import { buildRouteSummary } from "#/lib/routes"
import { wrapError } from "@repo/shared/lib/helpers"
import { withData, withError } from "#/shared/schemas"

const uploadDataSchema = t.Object({
  url: t.String(),
})

export const skinUpload = new Elysia()
  .use(defineRequiredUser())
  .post('/upload', async ({ status, nickname, body }) => {
    try {
      return { data: await upload(nickname, body) }
    } catch (e) {
      if (e instanceof RateLimitedError) {
        return status(429, wrapError("RATE_LIMITED"));
      }

      if (e instanceof InvalidSkinFileError) {
        return status(400, wrapError("INVALID_SKIN_FILE"));
      }

      return status(500, wrapError("INTERNAL_SERVER_ERROR"));
    }
  }, {
    parse: "multipart/form-data",
    body: uploadBodySchema,
    response: {
      200: withData(uploadDataSchema),
      400: withError(),
      429: withError(t.UnionEnum(["RATE_LIMITED"])),
      500: withError(),
    },
    detail: {
      summary: buildRouteSummary("Upload skin")
    }
  })
