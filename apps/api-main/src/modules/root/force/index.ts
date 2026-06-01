import Elysia from "elysia";
import * as z from "zod";
import { defineBearer } from "#/lib/define";
import { skinsModel } from "#/modules/server/skin/index.model";
import { minio } from "#/shared/minio/client";

export const forceSkinInit = new Elysia()
  .get("/skin/:nickname", async ({ params: { nickname }, query }) => {
    if (query.type === "single") {
      const ok = await skinsModel.skin.initSkin({
        nickname,
        minio: minio.getInstance,
      });
      if (!ok) return { data: "error" };
      return { data: "updated" };
    }

    if (query.type === "all") {
      skinsModel.skin.updateSkins({ minio: minio.getInstance });
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
