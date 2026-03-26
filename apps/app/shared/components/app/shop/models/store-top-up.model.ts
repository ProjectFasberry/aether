import { client, withJsonBody, withLogging } from "@/shared/lib/client-wrapper"
import { logError } from "@/shared/lib/log"
import { reatomAsync, withCache, withDataAtom, withStatusesAtom } from "@reatom/async"
import { atom, AtomState, Ctx } from "@reatom/core"
import { reatomRecord, withReset } from "@reatom/framework"
import { currencyCryptoSchema } from "@repo/shared/constants/currencies"
import { createOrderTopUpSchema, OutputPayload, StoreExchangeRatesPayload } from "@repo/shared/schemas/payment"
import { navigate } from "vike/client/router"
import * as z from "zod/v4"

type Schema = z.infer<typeof createOrderTopUpSchema>
type TopUpSearch = "recipient" | "target"

export const topUpRecipientAtom = atom<string>("", "topUpRecipient")
export const topUpMethodTypeAtom = atom<Schema["method"]["type"] | null>(null, "topUpMethod").pipe(withReset())
export const topUpMethodCurrencyAtom = atom<Schema["method"]["currency"] | null>(null, "topUpMethod").pipe(withReset());
export const topUpTargetAtom = atom<Schema["target"]>("CHARISM", "topUpTarget").pipe(withReset());
export const topUpCommentAtom = atom<Schema["comment"]>(undefined, "topUpComment").pipe(withReset());
export const topUpValueAtom = atom<Schema["value"]>(0, "topUpValue").pipe(withReset());
export const topUpValidationErrorAtom = atom<z.ZodError<Schema> | null>(null, "topUpValidationError").pipe(withReset())
export const topUpResultErrorAtom = atom<Error | null>(null, "topUpResultError").pipe(withReset())
export const topUpSearchAtom = reatomRecord<Partial<Record<TopUpSearch, string>>>({}, "topUpSearch")

export const topUpMethodsAction = reatomAsync(async (ctx) => {
  return await ctx.schedule(() =>
    client<{
      value: string;
      id: number;
      title: string;
      description: string | null;
      imageUrl: string;
    }[]>("store/methods").exec()
  )
}).pipe(withDataAtom(), withStatusesAtom(), withCache({ swr: false }))

export const topUpExchangeRatesAction = reatomAsync(async (ctx) => {
  return await ctx.schedule(() =>
    client<StoreExchangeRatesPayload>("store/exchange-rates").exec()
  )
}).pipe(
  withDataAtom(null, (_, data) => Object.entries(data).map(([type, values]) => ({ type, values }))),
  withStatusesAtom(),
  withCache({ swr: false })
)

const handlers: Record<TopUpSearch, (ctx: Ctx, value: string) => void> = {
  recipient: (ctx, value) => topUpRecipientAtom(ctx, value),
  target: (ctx, value) => topUpTargetAtom(ctx, value as AtomState<typeof topUpTargetAtom>),
}

topUpSearchAtom.onChange((ctx, state) => {
  for (const key in state) {
    handlers[key as TopUpSearch](ctx, state[key as TopUpSearch]!)
  }
})

topUpMethodTypeAtom.onChange((ctx, _) => topUpMethodCurrencyAtom.reset(ctx))
topUpTargetAtom.onChange((ctx, _) => topUpValueAtom.reset(ctx))

export const topUpAvailableCurrenciesAtom = atom((ctx) => {
  const type = ctx.spy(topUpMethodTypeAtom);

  if (type === 'cryptobot' || type === 'heleket') {
    return currencyCryptoSchema.options
  }

  if (type === 'sbp') {
    return z.enum(['RUB']).options
  }
}, "topUpAvailableCurrencies")

function reset(ctx: Ctx) {
  topUpMethodTypeAtom.reset(ctx);
  topUpMethodCurrencyAtom.reset(ctx);
  topUpTargetAtom.reset(ctx);
  topUpCommentAtom.reset(ctx);
  topUpValueAtom.reset(ctx);
  topUpValidationErrorAtom.reset(ctx);
  topUpResultErrorAtom.reset(ctx)
}

export const topUpIsValidAtom = atom((ctx) => {
  const raw: Schema = {
    method: {
      type: ctx.spy(topUpMethodTypeAtom)!,
      currency: ctx.spy(topUpMethodCurrencyAtom)!
    },
    target: ctx.spy(topUpTargetAtom),
    value: ctx.spy(topUpValueAtom),
    recipient: ctx.spy(topUpRecipientAtom),
    comment: ctx.spy(topUpCommentAtom)
  }

  const { success } = z.safeParse(createOrderTopUpSchema, raw)
  return success;
}, "topUpIsValidAtom")

export const topUpAction = reatomAsync(async (ctx) => {
  const raw: Schema = {
    method: {
      type: ctx.get(topUpMethodTypeAtom)!,
      currency: ctx.get(topUpMethodCurrencyAtom)!
    },
    recipient: ctx.get(topUpRecipientAtom),
    target: ctx.get(topUpTargetAtom),
    value: ctx.get(topUpValueAtom),
    comment: ctx.get(topUpCommentAtom)
  }

  const json = z.parse(createOrderTopUpSchema, raw)

  return await ctx.schedule(() =>
    client
      .post<OutputPayload>("store/order/top-up")
      .pipe(withJsonBody(json), withLogging())
      .exec())
}, {
  name: "topUpAction",
  onFulfill: (ctx, res) => {
    if (!res) return;

    ctx.schedule(() => {
      navigate(`/store/order/${res.uniqueId}`);
      reset(ctx);
    })
  },
  onReject: (ctx, e) => {
    logError(e, { type: "combined" })

    if (e instanceof Error) {
      topUpResultErrorAtom(ctx, e)
    }

    if (e instanceof z.ZodError) {
      const error = e;
      console.error(error);

      topUpValidationErrorAtom(ctx, error as AtomState<typeof topUpValidationErrorAtom>)
    }
  }
}).pipe(withStatusesAtom())