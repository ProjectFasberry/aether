import { env } from "@/shared/env";
import { client } from "@/shared/lib/client-wrapper";
import { atom } from "@reatom/framework";
import { reatomAsync, withAssign, withCache, withDataAtom, withStatusesAtom } from "@reatom/framework";

type ReferralListPayload = ExtractApiData<"getServerReferralsList">["data"]

export type Referral = ReferralListPayload[number]

export const referrals = atom(null, "referrals").pipe(
  withAssign((_, name) => ({
    fetch: reatomAsync(async (ctx) => {
      return await ctx.schedule(() =>
        client<ReferralListPayload>("server/referrals/list").exec()
      )
    }, `${name}.fetch`).pipe(
      withDataAtom(null, (_, data) => data.length === 0 ? null : data),
      withCache({ swr: false }),
      withStatusesAtom()
    ),
    getReferralIp: (v: string) => `${env.VITE_APP_URL}/auth?type=register&referrer=${v}`
  }))
)