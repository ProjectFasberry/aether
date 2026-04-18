import { client } from "@/shared/lib/client-wrapper"
import { reatomAsync, withCache, withDataAtom, withStatusesAtom } from "@reatom/async"

type BannerPayload = {
  initiator: string,
  expires: Date,
  created_at: Date,
  reason: string | null,
  nickname: string
}

export const bannedAction = reatomAsync(async (ctx) => {
  return await ctx.schedule(() =>
    client<BannerPayload>("validate/ban").exec()
  )
}).pipe(
  withDataAtom(),
  withStatusesAtom(),
  withCache({ swr: false })
)