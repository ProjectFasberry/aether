import { client } from "@/shared/lib/client-wrapper";
import { logError } from "@/shared/lib/log";
import { reatomAsync, withCache, withStatusesAtom } from "@reatom/framework";
import { action, atom, batch } from "@reatom/framework";
import { withAssign } from "@reatom/framework";
import { withLocalStorage } from "@reatom/persist-web-storage";

type BalancePayload = ExtractApiData<"getServerBalance">["data"]

export const balanceState = atom(null, "balanceState").pipe(
  withAssign((_, name) => ({
    charismBalance: atom(0, `${name}.charismBalance`),
    belkoinBalance: atom(0, `${name}.belkoinBalance`),
    settings: atom(null, `${name}.settings`).pipe(
      withAssign((_, name) => ({
        animateBalance: atom(true, `${name}.animateBalance`).pipe(
          withLocalStorage({ key: "animate-balance" })
        )
      }))
    ),
    targetServer: atom("bisquite", "balanceTargetServer")
  }))
)

export const balance = atom(null, "balance").pipe(
  withAssign((_, name) => ({
    refetchAll: action((ctx) => {
      balance.fetch.cacheAtom.reset(ctx)
      balance.fetch(ctx)
    }),
    fetch: reatomAsync(async (ctx) => {
      const server = ctx.get(balanceState.targetServer);

      return await client
        .get<BalancePayload>("server/balance", {
          searchParams: { server }
        })
        .exec()
    }, {
      name: `${name}.fetch`,
      onFulfill: async (ctx, res) => {
        const transform = (n: number) => Number(n.toFixed(2))

        batch(ctx, () => {
          balanceState.charismBalance(ctx, transform(res.CHARISM))
          balanceState.belkoinBalance(ctx, transform(res.BELKOIN))
        })
      },
      onReject: (_, e) => logError(e)
    }).pipe(
      withStatusesAtom(),
      withCache({ swr: false })
    )
  }))
)

balanceState.targetServer.onChange((ctx) => balance.refetchAll(ctx))