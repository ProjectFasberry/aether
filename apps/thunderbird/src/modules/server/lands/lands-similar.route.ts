import { buildRouteSummary, wrapError } from "#/utils";
import Elysia, { t } from "elysia";
import { getLandsByNickname, getRandomLands, landsByRandomSchema } from "./lands.model";
import { withData, withError } from "#/shared/schemas";

export const landsSimilar = new Elysia()
  .get("/similar", async ({ query, status }) => {
    const variant = query.variant ?? "random";

    if (variant === 'by-player') {
      const nickname = query.target;
      if (!nickname) throw status(400, wrapError("INVALID_TARGET"));

      const data = await getLandsByNickname(nickname, { exclude: query.exclude, limit: query.limit })
      return { data }
    }

    if (variant === 'random') {
      const data = await getRandomLands({ exclude: query.exclude, limit: query.limit })
      return { data }
    }

    throw status(400, wrapError("INVALID_VARIANT"))
  }, {
    query: t.Optional(
      t.Object({
        variant: t.UnionEnum(
          ["by-player", "random"],
          { default: "random", description: "The variant of land similarity to use" }
        ),
        exclude: t.Optional(
          t.String({ description: "Exclude a land by id" })
        ),
        target: t.Optional(t.String({ min: 4, description: "Must be a nickname or land id" })),
        limit: t.Optional(t.Number({ description: "Limit the number of results" }))
      })
    ),
    response: {
      200: withData(
        t.Nullable(landsByRandomSchema)
      ),
      400: withError(
        t.UnionEnum(["INVALID_VARIANT", "INVALID_TARGET"])
      )
    },
    detail: {
      summary: buildRouteSummary("Get lands similar")
    }
  })
