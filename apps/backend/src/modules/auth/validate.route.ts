import Elysia, { t } from "elysia";
import { session as sessionService } from "./login.model";
import { defineSession } from "#/lib/middlewares/define";
import { withData } from "#/shared/schemas";

export const validate = new Elysia()
  .use(defineSession())
  .derive(({ session }) => {
    if (!session) return { data: false }
    return { session }
  })
  .get("/validate-session", async ({ session: sessionToken }) => {
    if (!sessionToken) return { data: false };
    
    const data = await sessionService.getIsExistsSession(sessionToken);
    return { data }
  }, {
    response: {
      200: withData(t.Boolean())
    }
  })