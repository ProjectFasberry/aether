import { client, withQueryParams } from "@/shared/lib/client-wrapper";
import { reatomAsync, withCache, withDataAtom, withRetry, withStatusesAtom } from "@reatom/framework";
import { atom } from "@reatom/framework";
import { withAssign } from "@reatom/framework";

type StatusPayload = ExtractApiData<"getServerStatus">["data"]

export const serverStatus = atom(null, "serverStatus").pipe(
  withAssign((_, name) => ({
    fetch: reatomAsync(async (ctx) => {
      return await ctx.schedule(() =>
        client
          .get<StatusPayload>("server/status", {
            signal: ctx.controller.signal, 
            throwHttpErrors: false
          })
          .pipe(
            withQueryParams({ type: "servers" })
          )
          .exec()
      )
    }, `_`).pipe(
      withStatusesAtom(),
      withCache({ swr: false, staleTime: 60000 }),
      withDataAtom(null),
      withRetry()
    )
  }))
)