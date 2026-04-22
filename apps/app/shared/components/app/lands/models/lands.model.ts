import { isEmptyArray } from "@/shared/lib/utils";
import { client } from "@/shared/lib/client-wrapper";
import { logError } from "@/shared/lib/log";
import { pageContextAtom } from "@/shared/models/page-context.model";
import { reatomAsync, withCache, withDataAtom, withStatusesAtom } from "@reatom/async";
import { LandsPayload } from "@repo/shared/types/entities/land";

export const landsAction = reatomAsync(async (ctx, params?: { limit?: number }) => {
  const limit = params?.limit ?? 32;

  const param = ctx.get(pageContextAtom)?.urlParsed.search["from"];
  const fromIndex = param === 'index';

  if (fromIndex) {
    landsAction.dataAtom.reset(ctx)
    landsAction.cacheAtom.reset(ctx)
  }

  return await ctx.schedule(() =>
    client<LandsPayload>("server/lands/list", {
      signal: ctx.controller.signal,
      searchParams: {
        limit
      }
    }).exec()
  )
}, {
  onReject: (_, e) => {
    logError(e, { type: "combined" })
  }
}).pipe(
  withDataAtom(null, (ctx, data) => isEmptyArray(data.data) ? null : data.data),
  withCache({ swr: false }),
  withStatusesAtom()
)