import Elysia, { t } from "elysia";
import { getSeemsLikePlayersByPlayer, seemsPlayersSchema } from "./seems-players.model";
import { withData } from "#/shared/schemas";

const seemsPlayersPayload = t.Object({
  data: t.Array(t.Object({
    nickname: t.String(),
    uuid: t.String(),
    seemsRate: t.Number(),
    avatar: t.String()
  })),
  meta: t.Object({
    count: t.Number()
  })
})

export const seemsPlayers = new Elysia()
  .get("/seems-like/:nickname", async ({ query, request, params: { nickname } }) => {
    const data = await getSeemsLikePlayersByPlayer(nickname, query)
    return { data }
  }, {
    query: seemsPlayersSchema,
    response: {
      200: withData(seemsPlayersPayload)
    }
  })