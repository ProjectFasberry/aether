import { isEmptyArray } from "@/shared/lib/helpers";
import { client } from "@/shared/lib/client-wrapper";
import { logError } from "@/shared/lib/log";
import { pageState } from "@/shared/models/page-context.model";
import { reatomAsync, withCache, withDataAtom, withStatusesAtom } from "@reatom/framework";

export type LandsPayload = ExtractApiData<"getServerLandsList">["data"]

export const landsAction = reatomAsync(async (ctx, params?: { limit?: number }) => {
  const limit = params?.limit ?? 32;

  const param = ctx.get(pageState.urlParsed)?.search["from"];
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
  name: "_",
  onReject: (_, e) => {
    logError(e, { type: "combined" })
  }
}).pipe(
  withDataAtom(null, (_, data) => isEmptyArray(data.data) ? null : data.data),
  withCache({ swr: false }),
  withStatusesAtom()
)