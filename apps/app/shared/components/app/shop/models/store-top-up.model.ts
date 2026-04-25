import { client, withJsonBody } from "@/shared/lib/client-wrapper"
import { logError } from "@/shared/lib/log"
import { reatomAsync, withCache, withDataAtom, withStatusesAtom } from "@reatom/async"
import { action, atom, AtomState, Ctx } from "@reatom/core"
import { reatomRecord, withAssign, withReset } from "@reatom/framework"
import { currencyCryptoSchema } from "@repo/shared/constants/currencies"
import { createOrderTopUpSchema, OutputPayload, StoreExchangeRatesPayload } from "@repo/shared/schemas/payment"
import { navigate } from "vike/client/router"
import * as z from "zod/v4"

type Schema = z.infer<typeof createOrderTopUpSchema>
type TopUpSearch = "recipient" | "target"
// TODO: replace to generated types
type TopupMethod = {
  value: string;
  id: number;
  title: string;
  description: string | null;
  imageUrl: string;
}

export const topupState = atom(null, "topupState").pipe(
  withAssign((_, name) => ({
    recipient: atom<string>("", "topUpRecipient"),
    method: atom(null, `${name}.method`).pipe(
      withAssign(() => ({
        type: atom<Schema["method"]["type"] | null>(null, "topUpMethod").pipe(withReset()),
        currency: atom<Schema["method"]["currency"] | null>(null, "topUpMethod").pipe(withReset())
      }))
    ),
    target: atom<Schema["target"]>("CHARISM", "topUpTarget").pipe(withReset()),
    comment: atom<Schema["comment"]>(undefined, "topUpComment").pipe(withReset()),
    value: atom<Schema["value"]>(0, "topUpValue").pipe(withReset()),
    validationError: atom<z.ZodError<Schema> | null>(null, "topUpValidationError").pipe(withReset()),
    resultError: atom<Error | null>(null, "topUpResultError").pipe(withReset()),
    search: reatomRecord<Partial<Record<TopUpSearch, string>>>({}, "topUpSearch"),
  }))
)

const handlers: Record<TopUpSearch, (ctx: Ctx, value: string) => void> = {
  recipient: (ctx, value) => topupState.recipient(ctx, value),
  target: (ctx, value) => topupState.target(ctx, value as AtomState<typeof topupState.target>),
}

topupState.search.onChange((ctx, state) => {
  for (const key in state) {
    handlers[key as TopUpSearch](ctx, state[key as TopUpSearch]!)
  }
})

topupState.method.type.onChange((ctx, _) => topupState.method.currency.reset(ctx))
topupState.target.onChange((ctx, _) => topupState.value.reset(ctx))

export const topUpAvailableCurrenciesAtom = atom((ctx) => {
  const type = ctx.spy(topupState.method.type);

  if (type === 'cryptobot' || type === 'heleket') return currencyCryptoSchema.options
  if (type === 'sbp') return z.enum(['RUB']).options
})

export const topUpIsValidAtom = atom((ctx) => {
  const raw: Schema = {
    method: {
      type: ctx.spy(topupState.method.type)!,
      currency: ctx.spy(topupState.method.currency)!
    },
    target: ctx.spy(topupState.target),
    value: ctx.spy(topupState.value),
    recipient: ctx.spy(topupState.recipient),
    comment: ctx.spy(topupState.comment)
  }

  const result = z.safeParse(createOrderTopUpSchema, raw)
  return result.success;
})

export const topup = atom(null, "topup").pipe(
  withAssign((_, name) => ({
    resetAll: action((ctx) => {
      topupState.method.type.reset(ctx);
      topupState.method.currency.reset(ctx);
      topupState.target.reset(ctx);
      topupState.comment.reset(ctx);
      topupState.value.reset(ctx);
      topupState.validationError.reset(ctx);
      topupState.resultError.reset(ctx)
    }),
    fetchMethods: reatomAsync(async (ctx) => {
      return await ctx.schedule(() => client<TopupMethod[]>("store/methods").exec())
    }, `${name}.fetchMethods`).pipe(
      withDataAtom(),
      withStatusesAtom(),
      withCache({ swr: false })
    ),
    fetchExchange: reatomAsync(async (ctx) => {
      return await ctx.schedule(() => client<StoreExchangeRatesPayload>("store/exchange-rates").exec())
    }, `${name}.fetchExchange`).pipe(
      withDataAtom(null, (_, data) => Object.entries(data).map(([type, values]) => ({ type, values }))),
      withStatusesAtom(),
      withCache({ swr: false })
    ),
    submit: reatomAsync(async (ctx) => {
      const raw: Schema = {
        method: {
          type: ctx.get(topupState.method.type)!,
          currency: ctx.get(topupState.method.currency)!
        },
        recipient: ctx.get(topupState.recipient),
        target: ctx.get(topupState.target),
        value: ctx.get(topupState.value),
        comment: ctx.get(topupState.comment)
      }

      const json = z.parse(createOrderTopUpSchema, raw)

      return await client
        .post<OutputPayload>("store/order/top-up")
        .pipe(withJsonBody(json))
        .exec()
    }, {
      name: `${name}.submit`,
      onFulfill: (ctx, res) => {
        if (!res) return;

        ctx.schedule(() => {
          navigate(`/store/order/${res.uniqueId}`);
          topup.resetAll(ctx);
        })
      },
      onReject: (ctx, e) => {
        logError(e, { type: "combined" })

        if (e instanceof Error) {
          topupState.resultError(ctx, e)
        }

        if (e instanceof z.ZodError) {
          topupState.validationError(ctx, e as AtomState<typeof topupState.validationError>)
        }
      }
    }).pipe(
      withStatusesAtom()
    )
  }))
)