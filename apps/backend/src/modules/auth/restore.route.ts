import Elysia, { t } from "elysia"

export const restore = new Elysia()
  .resolve(({ headers }) => ({ userAgent: headers["user-agent"] }))
  .group("/restore", app => app
    .post("/validate", async ({ status, body, userAgent }) => {
      console.log(body)


      return { data: null }
    }, {
      parse: "json",
      body: t.Object({
        nickname: t.String(),
        hash: t.String()
      })
    })
    .post("/set-new-password", async (ctx) => {
      return { data: null }
    }, {
      parse: "json",
      body: t.Object({
        newPassword: t.String({ minLength: 6, maxLength: 64 })
      })
    })
  )