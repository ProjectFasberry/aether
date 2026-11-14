import Elysia, { t } from "elysia"
import { defineRequiredUser } from "#/lib/define"
import {
  ConfigurationError,
  InvalidSkinFileError,
  normalizeStatus,
  RateLimitedError,
  upload,
  uploadBodySchema,
  uploadQuerySchema,
  UpstreamError
} from "./skin.model"
import { buildRouteSummary } from "#/lib/routes"
import { wrapError } from "@repo/shared/lib/helpers"
import { withData, withError } from "#/shared/schemas"

const uploadDataSchema = t.Object({
  job: t.Object({
    id: t.String(),
    status: t.String(),
  }),
  url: t.Nullable(t.String()),
})

export const skinUpload = new Elysia()
  .use(defineRequiredUser())
  .post('/upload', async ({ query, status, nickname, body }) => {
    try {
      const uploadResult = await upload(nickname, query, body)

      const data = {
        job: uploadResult.job,
        url: uploadResult.result?.url ?? null,
      }

      return { data }
    } catch (e) {
      if (e instanceof RateLimitedError) {
        return status(429, wrapError("RATE_LIMITED"));
      }

      if (e instanceof InvalidSkinFileError) {
        return status(400, wrapError("INVALID_SKIN_FILE"));
      }

      if (e instanceof ConfigurationError) {
        return status(500, wrapError(e));
      }

      if (e instanceof UpstreamError) {
        const statuss = normalizeStatus(e.status, [400, 502, 504], 502);

        if (statuss === 400) {
          return status(400, wrapError(e));
        }
        if (statuss === 504) {
          return status(504, wrapError(e));
        }
        return status(502, wrapError(e));
      }

      return status(500, wrapError(e));
    }
  }, {
    parse: "multipart/form-data",
    query: uploadQuerySchema,
    body: uploadBodySchema,
    response: {
      200: withData(uploadDataSchema),
      400: withError(),
      429: withError(t.UnionEnum(["RATE_LIMITED"])),
      500: withError(),
      502: withError(),
      504: withError(),
    },
    detail: {
      summary: buildRouteSummary("Upload skin")
    }
  })
