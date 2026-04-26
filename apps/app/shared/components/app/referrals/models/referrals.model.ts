import { APP_URL } from "@/shared/env";
import { client } from "@/shared/lib/client-wrapper";
import { atom } from "@reatom/core";
import { reatomAsync, withAssign, withCache, withDataAtom, withStatusesAtom } from "@reatom/framework";

export type Referral = { id: number; completed: boolean; created_at: Date; referral: { nickname: string, avatar: string } }

export const referrals = atom(null, "referrals").pipe(
  withAssign((_, name) => ({
    fetch: reatomAsync(async (ctx) => {
      return await ctx.schedule(() =>
        client<Referral[]>("server/referrals/list").exec()
      )
    }, `${name}.fetch`).pipe(
      withDataAtom(null, (_, data) => data.length === 0 ? null : data),
      withCache({ swr: false }),
      withStatusesAtom()
    ),
    getReferralIp: (v: string) => `${APP_URL}/auth?type=register&referrer=${v}`
  }))
)