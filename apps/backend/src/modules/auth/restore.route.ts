import Elysia, { t } from "elysia";
import { HttpStatusEnum } from "elysia-http-status-code/status";
import { defineUser } from "#/lib/middlewares/define";
import { withData } from "#/shared/schemas";
import { botValidator } from "#/lib/middlewares/validators";

export const restore = new Elysia()
  .use(botValidator())
  .use(defineUser())
  .model({
    "login": withData(t.Object({ code: t.String() }))
  })
  .resolve(({ headers }) => ({ userAgent: headers["user-agent"] }))
  .post("/restore", async ({ status, userAgent }) => {

    
    
    return { data: null }
  })