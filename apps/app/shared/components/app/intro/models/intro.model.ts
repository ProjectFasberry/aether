import { client, withQueryParams } from "@/shared/lib/client-wrapper";
import { reatomAsync, withCache, withDataAtom, withRetry, withStatusesAtom } from "@reatom/async";
import { atom } from "@reatom/core";
import { withAssign } from "@reatom/framework";
import { StatusPayload } from "@repo/shared/types/entities/other"

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
    }, `${name}.fetch`).pipe(
      withStatusesAtom(),
      withCache({ swr: false, staleTime: 60000 }),
      withDataAtom(null),
      withRetry()
    )
  }))
)