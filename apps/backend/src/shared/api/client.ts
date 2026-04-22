import { logger } from "#/utils/config/logger"
import ky from "ky"

const timings = new Map()

let counter = 0

export const client = ky.create({
  hooks: {
    beforeRequest: [
      (req) => {
        const id = ++counter
        req.headers.set("x-request-id", id.toString())
        timings.set(id, Date.now())
        logger.withTag("Request").log(`[${req.method}] to ${req.url}`)
      }
    ],
    afterResponse: [
      async (req, options, res) => {
        const id = req.headers.get("x-request-id")
        const start = id && timings.get(Number(id))
        const duration = start ? Date.now() - start : 0
        logger.withTag("Response").log(`[${req.method}] ${req.url} — ${duration}ms`)
        if (id) timings.delete(Number(id))
      }
    ],
    beforeError: [
      (error) => {
        const req = error.request
        const id = req?.headers.get("x-request-id")
        const start = id && timings.get(Number(id))
        const duration = start ? Date.now() - start : 0
        logger.withTag("ResponseError").log(
          req
            ? `${req.method} ${req.url} - failed after ${duration}ms`
            : `Request failed — ${duration}ms`
        )
        if (id) timings.delete(Number(id))
        return error
      }
    ]
  }
})