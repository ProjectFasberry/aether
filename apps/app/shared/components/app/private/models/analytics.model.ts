import { client, withQueryParams } from "@/shared/lib/client-wrapper";
import { reatomAsync, withCache, withDataAtom, withStatusesAtom } from "@reatom/async";
import { atom, Ctx } from "@reatom/core";

type ChartData = {
  label: string;
  registrations: number;
};

export const registrationsPeriodAtom = atom<"day" | "month" | "hour">("day", "registrationsPeriod")
export const registrationsHourMinAtom = atom(0, "registrationsHourMin")

function refetchRegistrations(ctx: Ctx) {
  registrationsChartsAction.cacheAtom.reset(ctx)
  registrationsChartsAction(ctx)
}

registrationsPeriodAtom.onChange((ctx, state) => {
  refetchRegistrations(ctx)
})

export const registrationsChartsAction = reatomAsync(async (ctx) => {
  const period = ctx.get(registrationsPeriodAtom);

  return await ctx.schedule(() =>
    client<ChartData[]>("privated/analytics/registrations", { signal: ctx.controller.signal })
      .pipe(withQueryParams({ period }))
      .exec()
  )
}, "registrationsChartsAction").pipe(
  withDataAtom(null),
  withStatusesAtom(),
  withCache({ swr: false })
)