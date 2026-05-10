import { Ratings } from "@/shared/components/app/ratings/components/rating-list";
import { ratingByAtom, ratingsAction, ratingServerAtom } from "@/shared/components/app/ratings/models/ratings.model";
import { createPageModel } from "@/shared/lib/events";
import { pageState } from "@/shared/models/page-context.model";
import { useAtom } from "@reatom/npm-react";

const page = createPageModel({
  name: "ratingsById",
  onConnAction: (ctx, dataAtom) => {
    const routeParams = ctx.get(pageState.routeParams)

    const { id, parent } = routeParams;

    if (!id || !parent) {
      throw new Error("Target params is not defined")
    }

    ratingByAtom(ctx, id)
    ratingServerAtom(ctx, parent)
    ratingsAction(ctx)
  }
})

export default function Page() {
  const [_] = useAtom(page.dataAtom)

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <Ratings />
    </div>
  )
}