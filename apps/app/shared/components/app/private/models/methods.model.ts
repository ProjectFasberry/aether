import { client, withJsonBody } from "@/shared/lib/client-wrapper";
import { reatomAsync, withCache, withDataAtom, withStatusesAtom } from "@reatom/async";
import { toast } from "sonner";
import { notifyAboutRestrictRole } from "./actions.model";
import { logError } from "@/shared/lib/log";

export type PrivatedMethodsPayload = {
  id: number;
  description: string | null;
  imageUrl: string;
  isAvailable: boolean;
  title: string;
  value: string;
}[];

export const methodsAction = reatomAsync(async (ctx) => {
  return await ctx.schedule(() =>
    client<PrivatedMethodsPayload>("privated/store/methods/list", { signal: ctx.controller.signal })
      .exec()
  )
}).pipe(withDataAtom(), withStatusesAtom(), withCache({ swr: false }))

export const editMethodAction = reatomAsync(async (ctx, method: string, key: string, value: boolean | string) => {
  const body = { key, value }

  const result = await ctx.schedule(() =>
    client
      .post<{ [key: string]: string | boolean }>(`privated/store/methods/edit/${method}`)
      .pipe(withJsonBody(body))
      .exec()
  )

  return { method, result }
}, {
  name: "editMethodAction",
  onFulfill: (ctx, { result, method }) => {
    toast.success("Изменения применены");

    methodsAction.cacheAtom.reset(ctx);

    methodsAction.dataAtom(ctx, (state) => {
      if (!state) return undefined;

      return state.map((item) =>
        item.value === method
          ? { ...item, ...result }
          : item
      );
    })
  },
  onReject: (_, e) => {
    notifyAboutRestrictRole(e)
    logError(e)
  }
}).pipe(withStatusesAtom())