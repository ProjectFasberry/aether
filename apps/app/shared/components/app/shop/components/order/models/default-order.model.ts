import { action, atom } from "@reatom/framework"
import { sleep, withAssign } from "@reatom/framework"
import { orderState } from "../../../models/store-order.model"

orderState.requestEvent.onChange(async (ctx, target) => {
  if (target === 'invoice_paid') {
    showOrderLoaderAtom(ctx, true)
    await sleep(2000)
    showOrderLoaderAtom(ctx, false)
  }
})

export const isCopiedAtom = atom(false, "isCopied")

export const defaultOrderEvents = atom(null).pipe(
  withAssign((ctx, name) => ({
    disconnect: action((ctx) => {
      const source = ctx.get(orderState.es);
      if (!source) return;

      source.close()
      orderState.es.reset(ctx)
    }, `${name}.disconnect`),
    copyHref: action(async (ctx, value: string) => {
      await navigator.clipboard.writeText(value);
      isCopiedAtom(ctx, true)

      await ctx.schedule(() => sleep(2000))
      isCopiedAtom(ctx, false)
    }, `${name}.copyHref`)
  }))
)

export const showOrderLoaderAtom = atom(false, "showOrderLoader")

export const orderIsLoadingAtom = atom<boolean>((ctx) => {
  const target = ctx.spy(orderState.data)
  const es = ctx.spy(orderState.es)
  const result = Boolean(target && es)
  return !result
}, "orderIsLoading")