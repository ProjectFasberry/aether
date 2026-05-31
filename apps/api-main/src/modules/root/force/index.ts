import Elysia from "elysia";
import { initPlayerSkin, updatePlayersSkins } from "../../server/skin/skin.model";
import * as z from "zod";
import { defineBearer } from "#/lib/define";

export const forceSkinInit = new Elysia()
  .get("/skin/:nickname", async ({ params: { nickname }, query }) => {
    if (query.type === "single") {
      const ok = await initPlayerSkin(nickname);
      if (!ok) return { data: "error" };
      return { data: "updated" };
    }

    if (query.type === "all") {
      updatePlayersSkins();
    }

    return { data: "started" };
  }, {
    query: z.object({
      type: z.enum(["single", "all"]).optional().default("single"),
    }),
  });

export const force = new Elysia()
  .group("/force", (app) => app
    .use(defineBearer())
    .group("/init", (app) => app
      .use(forceSkinInit)
    )
  );
