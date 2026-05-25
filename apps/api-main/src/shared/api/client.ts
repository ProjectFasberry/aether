import { logger } from "#/utils/config/logger"
import ky from "ky"

const timings = new Map()
const clientLogger = logger.withTag("Request");

let counter = 0

export const client = ky.create({
  hooks: {
    beforeRequest: [
      ({ request }) => {
        const id = ++counter
        request.headers.set("x-request-id", id.toString())
        timings.set(id, Date.now())
        clientLogger.log(`${request.method} ${request.url}`)
      }
    ],
    afterResponse: [
      async ({ request }) => {
        const id = request.headers.get("x-request-id")
        if (!id) return;

        const start = id && timings.get(Number(id))
        const duration = start ? Date.now() - start : 0
        clientLogger.log(`${request.method} ${request.url} / ${duration}ms`)

        if (id) {
          timings.delete(Number(id))
        }
      }
    ],
  }
})