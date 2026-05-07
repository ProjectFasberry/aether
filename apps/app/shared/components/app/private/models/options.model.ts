import { client, withJsonBody } from "@/shared/lib/client-wrapper";
import { reatomAsync, withCache, withStatusesAtom } from "@reatom/framework";
import { reatomMap } from "@reatom/framework";
import { notifyAboutRestrictRole } from "./actions.model";

export type Option = {
  title: string,
  name: string,
  value: boolean
}

export const optionsAtom = reatomMap<string, Option>();

export const updateOptionAction = reatomAsync(async (ctx, name: Option["name"], value: Option["value"]) => {
  const json = { value }

  const result = await client
    .post<Pick<Option, "value">>(`privated/options/${name}/edit`,)
    .pipe(withJsonBody(json))
    .exec()

  return { name, result }
}, {
  name: "updateOptionAction",
  onFulfill: (ctx, { name, result }) => {
    const option = optionsAtom.get(ctx, name)
    if (!option) return;

    optionsAtom.set(ctx, name, { ...option, value: result.value })
  },
  onReject: (_, e) => notifyAboutRestrictRole(e)
}).pipe(withStatusesAtom())

export const optionsAction = reatomAsync(async (ctx) => {
  return await ctx.schedule(() => client<Option[]>("privated/options/list").exec())
}, {
  name: "optionsAction",
  onFulfill: (ctx, res) => {
    const options = new Map(res.map(option => [option.name, option]));
    optionsAtom(ctx, options)
  },
  onReject: (_, e) => notifyAboutRestrictRole(e)
}).pipe(withStatusesAtom(), withCache({ swr: false }))