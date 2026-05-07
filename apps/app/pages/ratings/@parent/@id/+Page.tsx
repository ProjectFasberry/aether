import { Ratings } from "@/shared/components/app/ratings/components/rating-list";
import { ratingByAtom, ratingsAction, ratingServerAtom } from "@/shared/components/app/ratings/models/ratings.model";
import { startPageEvents } from "@/shared/lib/events";
import { pageCtxAtom } from "@/shared/models/page-context.model";
import { action, batch } from "@reatom/framework";
import { useUpdate } from "@reatom/npm-react";

const events = action((ctx) => {
  const pageCtx = ctx.get(pageCtxAtom)
  if (!pageCtx) return;

  const { id, parent } = pageCtx.routeParams

  if (!id || !parent) {
    throw new Error("Target params is not defined")
  }
  
  batch(ctx, () => {
    ratingByAtom(ctx, id)
    ratingServerAtom(ctx, parent)
  })

  ratingsAction(ctx)
})

export default function Page() {
  useUpdate((ctx) => startPageEvents(ctx, events), [])

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <Ratings />
    </div>
  )
}