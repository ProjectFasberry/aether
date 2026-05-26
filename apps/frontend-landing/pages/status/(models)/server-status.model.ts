import { client } from "@/shared/api/client"
import { wrapClient } from "@/shared/lib/api";
import { reatomAsync, withCache, withDataAtom, withStatusesAtom } from "@reatom/framework"
import { atom, withAssign } from "@reatom/framework";

export type Player = { uuid: string; name_raw: string };
export type PlayerStatusProps = { nickname: string }

type ServerStatus = {
  proxy: {
    online: number,
    players: Array<string>,
    status: string,
    max: number
  },
  servers: {
    [key: string]: {
      online: number
    }
  }
}

export const serverStatus = atom(null, "serverStatus").pipe(
  withAssign((_, name) => ({
    fetch: reatomAsync(async (ctx) => {
      return await ctx.schedule(() =>
        wrapClient<ServerStatus>(() => client("server/status", { searchParams: { type: "servers" }, signal: ctx.controller.signal }))
      )
    }, {
      name: `${name}.fetch`
    }).pipe(
      withCache({ swr: false }),
      withDataAtom(),
      withStatusesAtom()
    )
  }))
)
