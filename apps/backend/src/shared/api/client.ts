import { logger } from "#/utils/config/logger"
import ky from "ky"

const timings = new Map()

let counter = 0

export const client = ky.create({
  hooks: {
    beforeRequest: [
      (req) => {
        const id = ++counter
        req.request.headers.set("x-request-id", id.toString())
        timings.set(id, Date.now())
        logger.withTag("Request").log(`[${req.request.method}] to ${req.request.url}`)
      }
    ],
    afterResponse: [
      async (req) => {
        const id = req.request.headers.get("x-request-id")
        const start = id && timings.get(Number(id))
        const duration = start ? Date.now() - start : 0
        logger.withTag("Response").log(`[${req.request.method}] ${req.request.url} — ${duration}ms`)
        if (id) timings.delete(Number(id))
      }
    ],
  }
})