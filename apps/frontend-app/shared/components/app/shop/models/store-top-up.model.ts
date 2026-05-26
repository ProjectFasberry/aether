import { client, withJsonBody } from "@/shared/lib/client-wrapper"
import { logError } from "@/shared/lib/log"
import { currentUserState } from "@/shared/models/current-user/index.model"
import { reatomAsync, withCache, withDataAtom, withStatusesAtom } from "@reatom/framework"
import { action, atom, type AtomMut, type AtomState, type Ctx } from "@reatom/framework"
import { withAssign, withInit, withReset } from "@reatom/framework"
import { createOrderTopUpSchema } from "@/shared/schemas/payment"
import { navigate } from "vike/client/router"
import * as z from "zod"
import { createNavigationModel } from "../../auth/models/navigation.model"
import { validateNumber } from "@/shared/lib/utils"

type OutputPayload = ExtractApiData<"postStoreOrderExternalCreate">["data"]
export type StoreExchangeRatesPayload = ExtractApiData<"getStoreOrderExternalExchange-rates">["data"]
type Schema = z.infer<typeof createOrderTopUpSchema>
type TopUpSearch = "recipient" | "target"
export type TopupMethodListPayload = ExtractApiData<"getStoreOrderExternalMethodsList">["data"]

export type TopupType = "start-input" | "select-method" | "confirm"

export const topupState = atom(null, "topupState").pipe(
  withAssign((_, name) => ({
    recipient: atom<string>("", "topUpRecipient").pipe(
      withInit((ctx, target) => {
        const currentUser = ctx.get(currentUserState);
        return currentUser?.nickname ?? target(ctx)
      })
    ),
    method: atom(null, `${name}.method`).pipe(
      withAssign(() => ({
        type: atom<TopupMethodListPayload[number] | null>(null, "topUpMethod").pipe(withReset()),
        currency: atom<string | null>(null, "topUpMethod").pipe(withReset())
      }))
    ),
    wallet: atom<string>("CHARISM", "topUpTarget").pipe(withReset()),
    comment: atom<Schema["comment"]>(undefined, "topUpComment").pipe(withReset()),
    value: atom<Schema["value"]>(0, "topUpValue").pipe(
      withReset(),
      withAssign(() => ({
        onChangeEvent: action((ctx, e: React.ChangeEvent<HTMLInputElement>) => {
          const value = validateNumber(e.target.value);
          if (value !== null) topupState.value(ctx, value)
        })
      }))
    ),
    validationError: atom<z.ZodError<Schema> | null>(null, "topUpValidationError").pipe(withReset()),
    resultError: atom<Error | null>(null, "topUpResultError").pipe(withReset()),
    search: atom<Partial<Record<TopUpSearch, string>>>({}, "topUpSearch").pipe(withReset()),
    WALLETS: [
      { title: "Харизма", value: "CHARISM" },
      { title: "Белкоин", value: "BELKOIN" }
    ],
    type: atom<TopupType>("start-input", `${name}.type`).pipe(withReset())
  }))
)

const handlers: Record<TopUpSearch, (ctx: Ctx, value: string) => void> = {
  recipient: (ctx, value) => topupState.recipient(ctx, value),
  target: (ctx, value) => topupState.wallet(ctx, value as AtomState<typeof topupState.wallet>),
}

topupState.search.onChange((ctx, state) => {
  for (const key in state) {
    handlers[key as TopUpSearch](ctx, state[key as TopUpSearch]!)
  }
})

topupState.method.type.onChange((ctx) => topupState.method.currency.reset(ctx))
topupState.wallet.onChange((ctx) => topupState.value.reset(ctx))

export const topup = atom(null, "topup").pipe(
  withAssign((_, name) => ({
    resetAll: action((ctx) => {
      topupState.method.type.reset(ctx);
      topupState.method.currency.reset(ctx);
      topupState.wallet.reset(ctx);
      topupState.comment.reset(ctx);
      topupState.value.reset(ctx);
      topupState.validationError.reset(ctx);
      topupState.resultError.reset(ctx)
      topupState.search.reset(ctx)
      topupState.type.reset(ctx)
    }),
    fetchMethods: reatomAsync(async (ctx) => {
      return await ctx.schedule(() =>
        client<TopupMethodListPayload>("store/order/external/methods/list").exec()
      )
    }, {
      name: `${name}.fetchMethods`,
      onFulfill: (ctx, res) => {
        if (res.length >= 1) {
          topupState.method.type(ctx, res[0])
        }
      }
    }).pipe(
      withDataAtom(),
      withStatusesAtom(),
      withCache({ swr: false })
    ),
    fetchExchange: reatomAsync(async (ctx) => {
      return await ctx.schedule(() =>
        client<StoreExchangeRatesPayload>("store/order/external/exchange-rates").exec()
      )
    }, `${name}.fetchExchange`).pipe(
      withDataAtom(null, (_, data) => Object.entries(data).map(([type, values]) => ({ type, values }))),
      withStatusesAtom(),
      withCache({ swr: false })
    ),
    toOrder: action((ctx, uniqueId: string) => {
      navigate(`/store/order/${uniqueId}`);
      topup.resetAll(ctx);
    }),
    submit: reatomAsync(async (ctx) => {
      const raw: Schema = {
        method: {
          type: ctx.get(topupState.method.type)?.value as Schema["method"]["type"],
          currency: ctx.get(topupState.method.currency) as Schema["method"]["currency"]
        },
        recipient: ctx.get(topupState.recipient),
        target: ctx.get(topupState.wallet) as Schema["target"],
        value: ctx.get(topupState.value),
        comment: ctx.get(topupState.comment)
      }

      const json = z.parse(createOrderTopUpSchema, raw)

      return await client
        .post<OutputPayload>("store/order/external/create")
        .pipe(withJsonBody(json))
        .exec()
    }, {
      name: `${name}.submit`,
      onReject: (ctx, e) => {
        logError(e)

        if (e instanceof Error) {
          topupState.resultError(ctx, e)
        }

        if (e instanceof z.ZodError) {
          topupState.validationError(ctx, e as AtomState<typeof topupState.validationError>)
        }
      }
    }).pipe(
      withDataAtom(),
      withStatusesAtom()
    ),
    validators: atom(null, `${name}.validators`).pipe(
      withAssign(() => ({
        startInput: atom((ctx) => {
          const raw: Omit<Schema, "method"> = {
            target: ctx.spy(topupState.wallet) as Schema["target"],
            value: ctx.spy(topupState.value),
            recipient: ctx.spy(topupState.recipient),
            comment: ctx.spy(topupState.comment)
          }

          const schema = createOrderTopUpSchema.omit({ method: true });
          return z.safeParse(schema, raw).success;
        }),
        selectMethod: atom((ctx) => {
          const raw: Pick<Schema, "method"> = {
            method: {
              type: ctx.spy(topupState.method.type)?.value as Schema["method"]["type"],
              currency: ctx.spy(topupState.method.currency) as Schema["method"]["currency"]
            }
          }

          const schema = createOrderTopUpSchema.pick({ method: true });
          return z.safeParse(schema, raw).success;
        })
      }))
    )
  }))
)

export const topupNavigationModel = createNavigationModel({
  steps: [
    {
      id: "start-input",
      validators: {
        toNext: topup.validators.startInput
      },
      cb: action((ctx) => { topup.fetchMethods(ctx); return true })
    },
    {
      id: "select-method",
      validators: {
        toNext: topup.validators.selectMethod
      },
      cb: action((ctx) => { topup.submit(ctx); return true })
    },
    {
      id: "confirm"
    }
  ],
  typeAtom: topupState.type as AtomMut<string>,
  opts: {
    withLog: true
  }
})

export const topupErrorAtom = atom((ctx) => {
  const validationError = ctx.spy(topupState.validationError);
  const resultError = ctx.spy(topupState.resultError)
  return validationError || resultError
})
