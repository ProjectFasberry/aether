import Elysia, { t } from "elysia";
import { validatePermission } from "#/lib/validators";
import { buildRouteSummary } from "#/lib/routes";
import { withData, withError } from "#/shared/schemas";
import { wrapError } from "@repo/shared/lib/helpers";
import { skinsService } from "#/shared/services/skins";
import { minioService } from "#/shared/services/minio";
import { playerService } from "#/shared/services/player";

const resultSchema = t.Object({
  removed: t.Number(),
});

const rejectBody = t.Object({
  skinName: t.String({ minLength: 1, maxLength: 36 }),
});

/** The audit trail wants a uuid; a panel account without a player row is still auditable. */
const actorUuid = async (nickname: string) =>
  playerService.getUuid(nickname).catch(() => "system");

export const skinsPrivate = new Elysia()
  .use(validatePermission("skins.moderate", { withExternal: true }))
  .delete("/user/:nickname/skin", async ({ params, body, nickname, status }) => {
    const removed = await skinsService.skin.rejectSkin(
      params.nickname,
      body.skinName,
      await actorUuid(nickname ?? ""),
      minioService.getInstance,
    );

    if (!removed) return status(404, wrapError("SKIN_NOT_FOUND"));

    return { data: { removed } };
  }, {
    body: rejectBody,
    response: {
      200: withData(resultSchema),
      404: withError(t.UnionEnum(["SKIN_NOT_FOUND"])),
    },
    detail: {
      summary: buildRouteSummary("Reject a player skin"),
    },
  })
  .delete("/user/:nickname/skins", async ({ params, nickname }) => {
    const removed = await skinsService.skin.rejectAllSkins(
      params.nickname,
      await actorUuid(nickname ?? ""),
      minioService.getInstance,
    );

    return { data: { removed } };
  }, {
    response: {
      200: withData(resultSchema),
    },
    detail: {
      summary: buildRouteSummary("Reject all player skins"),
    },
  });
