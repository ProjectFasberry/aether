import { validatePermission } from "#/lib/validators";
import { Permissions } from "#/shared/constants/permissions";
import Elysia from "elysia";
import { chat, chatDataSchema } from "./chat.model";

export const chatData = new Elysia()
  .use(validatePermission(Permissions.get("PRIVATE.CHAT.READ")))
  .get("/list", async ({ query: { asc, endCursor }, nickname }) => {
    const data = await chat.getHistory({ asc, endCursor, nickname })
    return { data }
  }, {
    query: chatDataSchema
  })