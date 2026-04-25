import { TopUp } from "@/shared/components/app/shop/components/wallet/top-up";
import { topup, topupState } from "@/shared/components/app/shop/models/store-top-up.model";
import { startPageEvents } from "@/shared/lib/events";
import { pageContextAtom } from "@/shared/models/page-context.model";
import { action } from "@reatom/core";
import { reatomComponent, useUpdate } from "@reatom/npm-react";
import { Typography } from "@repo/ui/typography";

const events = action((ctx) => {
  const pageContext = ctx.get(pageContextAtom);
  if (!pageContext) return;

  const search = pageContext.urlParsed.search;

  topupState.search(ctx, search);

  topup.fetchMethods(ctx)
  topup.fetchExchange(ctx)
})

const StoreLoader = reatomComponent(({ ctx }) => {
  const isLoading = ctx.spy(topup.submit.statusesAtom).isPending;

  ctx.schedule(() => {
    if (isLoading) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
  });

  if (!isLoading) return null;

  return (
    <div className="flex z-[1000] items-center flex-col gap-4 fixed bg-black/60 justify-center h-full w-full">
      <div className="ui-loader loader-blk">
        <svg viewBox="22 22 44 44" className="multiColor-loader">
          <circle cx="44" cy="44" r="20.2" fill="none" strokeWidth="3.6" className="loader-circle loader-circle-animation">
          </circle>
        </svg>
      </div>
      <Typography className="font-semibold text-xl">
        Готовим заказ
      </Typography>
    </div>
  )
}, "StoreLoader")

export default function Page() {
  useUpdate((ctx) => startPageEvents(ctx, events), [pageContextAtom])

  return (
    <>
      <StoreLoader />
      <TopUp />
    </>
  )
}