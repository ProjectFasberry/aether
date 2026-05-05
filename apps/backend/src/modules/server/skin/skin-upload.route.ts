import Elysia from "elysia"
import { defineUser } from "#/lib/define"
import {
  ConfigurationError,
  normalizeStatus,
  upload,
  uploadBodySchema,
  uploadQuerySchema,
  UpstreamError
} from "./skin.model"
import { wrapError } from "#/helpers/wrap-error"

export const skinUpload = new Elysia()
  .use(defineUser())
  .post('/upload', async ({ query, status, nickname, body }) => {
    try {
      const uploadResult = await upload(nickname, query, body, { status })

      if (uploadResult.result !== null) {
        const data = {
          job: uploadResult.job,
          url: uploadResult.result.url,
        }

        return { data }
      }

      const data = {
        job: uploadResult.job,
        url: null,
      }

      return { data }
    } catch (e) {
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
    body: uploadBodySchema
  })