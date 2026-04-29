import Elysia, { t } from "elysia";
import { session } from "./login.model";
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
    
    const data = await session.getIsExistsSession(sessionToken);
    return { data }
  }, {
    response: {
      200: withData(
        t.Boolean()
      )
    }
  })