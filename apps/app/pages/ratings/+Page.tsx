import { buildRatings } from "@/shared/components/app/ratings/models/ratings.model"
import { Link } from "@/shared/components/config/link"
import { atom } from "@reatom/core"
import { reatomComponent } from "@reatom/npm-react"
import { Typography } from "@repo/ui/typography"

const ratingsListAtom = atom(() => buildRatings(), "ratingsList")

const RatingsList = reatomComponent(({ ctx }) => {
  const data = ctx.spy(ratingsListAtom)

  return (
    <div className="grid grid-cols-1 auto-rows-auto gap-8 min-w-0 w-full h-full">
      {data.map((item) => (
        <div key={item.title} className="flex flex-col gap-2 min-w-0 w-full">
          <Typography className="font-semibold text-xl">
            {item.title}
          </Typography>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 auto-rows-auto gap-2 min-w-0 w-full h-full">
            {item.childs.map((n) =>
              <Link
                key={n.value}
                href={`/ratings/${item.key}/${n.value}`}
                className="flex border text-nowrap truncate min-w-0 border-neutral-700 p-4 hover:bg-neutral-800 rounded-xl"
              >
                {n.title}
              </Link>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}, "RatingsList")

export default function Page() {
  return <RatingsList />
}