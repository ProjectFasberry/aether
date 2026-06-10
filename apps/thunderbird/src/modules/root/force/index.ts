import Elysia from "elysia";
import * as z from "zod";
import { defineBearer } from "#/lib/define";
import { skinsService } from "#/shared/services/skins";
import { nats } from "#/shared/nats/client";
import { minioService } from "#/shared/services/minio";

export const forceSkinInit = new Elysia()
  .get("/skin/:nickname", async ({ params: { nickname }, query }) => {
    if (query.type === "single") {
      const ok = await skinsService.skin.initSkin({
        nickname,
        minio: minioService.getInstance,
      });
      if (!ok) return { data: "error" };
      return { data: "updated" };
    }

    if (query.type === "all") {
      skinsService.skin.updateSkins({ minio: minioService.getInstance, nats: nats.getInstance });
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
