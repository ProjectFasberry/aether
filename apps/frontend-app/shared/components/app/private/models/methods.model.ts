import { client, withJsonBody } from "@/shared/lib/client-wrapper";
import { action, atom, reatomAsync, reatomMap, withAssign, withCache, withDataAtom, withStatusesAtom } from "@reatom/framework";
import { notifyAboutRestrictRole } from "./actions.model";
import { invariant } from "@/shared/lib/invariant";

export type PrivatedMethodsPayload = ExtractApiData<"getPrivatedStoreMethodsList">["data"]

type StoreMethod = PrivatedMethodsPayload[number]
type StoreMethodExtended = StoreMethod & {
  meta: {
    isLoading: boolean
  }
}

const methodsAtom = reatomMap<number, StoreMethodExtended>();

const getMethodIsLoading = (id: number) => atom((ctx) =>
  ctx.spy(methodsAtom).get(id)?.meta.isLoading ?? false
)

const methods = atom(null).pipe(
  withAssign((_, name) => ({
    fetch: reatomAsync(async (ctx) => {
      return await ctx.schedule(() =>
        client
          .get<PrivatedMethodsPayload>("privated/store/methods/list", { signal: ctx.controller.signal })
          .exec()
      )
    }, {
      name: `${name}.fetch`,
      onFulfill: (ctx, res) => {
        const defaultOpts = {
          isLoading: false
        }

        methodsAtom(ctx, new Map(res.map((item) => [item.id, { ...item, meta: defaultOpts }])))
      }
    }).pipe(
      withDataAtom(),
      withStatusesAtom(),
      withCache({ swr: false })
    )
  }))
)
const methodsControl = atom(null, "methodsControl").pipe(
  withAssign((_, name) => ({
    updateMethod: action((ctx, method: StoreMethod["id"], value: Partial<StoreMethodExtended>) => {
      const existsMethod = methodsAtom.get(ctx, method)
      if (existsMethod) {
        methodsAtom.set(ctx, method, { ...existsMethod, ...value })
      }
    }),
    update: reatomAsync(async (ctx, id: StoreMethod["id"], key: string, value: boolean | string) => {
      const body = { key, value }

      try {
        const methodValue = methodsAtom.get(ctx, id)?.value
        invariant(methodValue, "Method value is not defined");

        methodsControl.updateMethod(ctx, id, {
          meta: { isLoading: true },
          [key]: value
        });

        const result = await client
          .post<ExtractApiData<"postPrivatedStoreMethodsEditByMethod">["data"]>(`privated/store/methods/edit/${methodValue}`)
          .pipe(withJsonBody(body))
          .exec()

        methodsControl.updateMethod(ctx, id, {
          meta: { isLoading: false },
          [key]: value
        })

        return { id, result }
      } catch (e) {
        methodsControl.updateMethod(ctx, id, {
          meta: { isLoading: false },
          [key]: typeof value === 'boolean' ? !value : value
        })

        throw e;
      }
    }, {
      name: `${name}.update`,
      onFulfill: (ctx, { result, id }) => {
        methods.fetch.cacheAtom.reset(ctx);

        methods.fetch.dataAtom(ctx, (state) => {
          if (!state) return;
          return state.map(m => m.id === id ? { ...m, ...result } : m);
        })
      },
      onReject: (_, e) => notifyAboutRestrictRole(e)
    }).pipe(
      withStatusesAtom()
    )
  }))
)

export const methodsModel = () => {
  return {
    methodsControl,
    methods,
    getMethodIsLoading
  }
}
