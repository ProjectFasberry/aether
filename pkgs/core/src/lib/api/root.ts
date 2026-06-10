import ky from "ky"
import { logger } from "../../constants/logger"

const timings = new Map<number, number>()
let counter = 0

const requestLogger = logger.withTag("request")
const getRequestInfo = (request: Request, ...args: unknown[]) =>
  `${request.method} ${request.url} ${args.join(" ")}`

export const createClient = ({ verbose }: { verbose: boolean } = { verbose: true }) => ky.create({
  hooks: {
    beforeRequest: [
      ({ request }) => {
        const id = ++counter

        request.headers.set("x-request-id", String(id))
        timings.set(id, Date.now());

        if (verbose) {
          requestLogger.withTag("start").log(getRequestInfo(request))
        }
      }
    ],
    afterResponse: [
      async ({ request }) => {
        const id = request.headers.get("x-request-id")
        if (!id) return;

        const start = id ? (timings.get(Number(id)) ?? Date.now()) : Date.now()

        if (verbose) {
          requestLogger.withTag("end").log(getRequestInfo(request, `${Date.now() - start}ms`))
        }

        if (id) {
          timings.delete(Number(id))
        }
      }
    ],
  }
})
