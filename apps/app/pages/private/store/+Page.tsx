import { StorePrivated } from "@/shared/components/app/private/components/store";
import { searchParamsAtom } from "@/shared/components/app/private/models/store.model";
import { startPageEvents } from "@/shared/lib/events";
import { pageCtxAtom } from "@/shared/models/page-context.model";
import { action } from "@reatom/framework";
import { useUpdate } from "@reatom/npm-react";

const events = action((ctx) => {
  const pageContext = ctx.get(pageCtxAtom)
  if (!pageContext) return;

  const search = pageContext.urlParsed.search;

  searchParamsAtom(ctx, search)
})

export default function Page() {
  useUpdate((ctx) => startPageEvents(ctx, events), [pageCtxAtom]);

  return (
    <div className="bg-neutral-900 rounded-xl p-4">
      <StorePrivated />
    </div>
  )
}