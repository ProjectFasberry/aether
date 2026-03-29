import { Ratings } from "@/shared/components/app/ratings/components/rating-list";
import { ratingByAtom, ratingsAction, ratingServerAtom } from "@/shared/components/app/ratings/models/ratings.model";
import { startPageEvents } from "@/shared/lib/events";
import { pageContextAtom } from "@/shared/models/page-context.model";
import { BackButton } from "@/shared/ui/back-button";
import { action, batch } from "@reatom/core";
import { useUpdate } from "@reatom/npm-react";

const events = action((ctx) => {
  const pageContext = ctx.get(pageContextAtom)
  if (!pageContext) return;

  const { id, parent } = pageContext.routeParams

  if (!id || !parent) {
    throw new Error("Target params is not defined")
  }
  
  batch(ctx, () => {
    ratingByAtom(ctx, id)
    ratingServerAtom(ctx, parent)
  })

  ratingsAction(ctx)
}, "events")

export default function Page() {
  useUpdate((ctx) => startPageEvents(ctx, events), [])

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <BackButton href='/ratings' />
      <Ratings />
    </div>
  )
}