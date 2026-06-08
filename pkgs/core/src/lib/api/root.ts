import consola from "consola"
import ky from "ky"

const timings = new Map<number, number>()
let counter = 0

const requestLogger = consola.withTag("request")
const getRequestInfo = (request: Request, ...args: unknown[]) =>
  `${request.method} ${request.url} ${args.join(" ")}`

export const client = ky.create({
  hooks: {
    beforeRequest: [
      ({ request }) => {
        const id = ++counter
        request.headers.set("x-request-id", String(id))
        timings.set(id, Date.now())
        requestLogger.withTag("start").log(getRequestInfo(request))
      }
    ],
    afterResponse: [
      async ({ request }) => {
        const id = request.headers.get("x-request-id")
        if (!id) return;

        const start = id ? (timings.get(Number(id)) ?? Date.now()) : Date.now()
        requestLogger.withTag("end").log(getRequestInfo(request, `${Date.now() - start}ms`))

        if (id) {
          timings.delete(Number(id))
        }
      }
    ],
  }
})
