import { Link } from "@/shared/components/config/link"
import { client } from "@/shared/lib/client-wrapper"
import { reatomAsync, withCache, withDataAtom } from "@reatom/async"
import { reatomComponent, useUpdate } from "@reatom/npm-react"
import { Typography } from "@repo/ui/typography"
import { IconChevronRight, IconTrophy } from "@tabler/icons-react"

type Node = Pick<{ title: string; childs: string[] }, "title"> & {
  childs: { title: string, value: string }[],
  key: string
};

const ratingsListAtom = reatomAsync(async (ctx) => {
  return await ctx.schedule(() => client<Node[]>("server/rating/list").exec())
}, "ratingsList").pipe(withDataAtom(), withCache({ swr: false }))

const RatingsList = reatomComponent(({ ctx }) => {
  useUpdate(ratingsListAtom, []);

  const data = ctx.spy(ratingsListAtom.dataAtom)
  if (!data) return null;

  return (
    <div className="grid grid-cols-1 auto-rows-auto gap-8 min-w-0 w-full h-full">
      {data.map((section) => (
        <section key={section.key} className="flex flex-col gap-6">
          <div className="flex items-center gap-3 border-b border-neutral-800 pb-4">
            <Typography className="font-bold text-2xl tracking-tight">
              {section.title}
            </Typography>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {section.childs.map((child) => (
              <Link
                key={child.value}
                href={`/ratings/${section.key}/${child.value}`}
                className="group relative flex items-center justify-between p-4 border border-neutral-600 bg-neutral-800
                  rounded-xl duration-300"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="p-2.5 bg-neutral-50 rounded-xl transition-colors">
                    <IconTrophy size={20} className="text-neutral-950 group-hover:text-yellow-500" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-medium text-neutral-200 truncate">
                      {child.title}
                    </span>
                    <span className="text-xs text-neutral-500 uppercase tracking-wider font-semibold">
                      Посмотреть топ
                    </span>
                  </div>
                </div>
                <IconChevronRight
                  size={18}
                  className="text-neutral-600 group-hover:text-neutral-300"
                />
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}, "RatingsList")

export default function Page() {
  return <RatingsList />
}