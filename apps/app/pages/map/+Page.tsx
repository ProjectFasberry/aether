import { Link } from "@/shared/components/config/link"
import { client } from "@/shared/lib/client-wrapper"
import { getStaticImage } from "@/shared/lib/volume-helpers"
import { PageHeaderImage } from "@/shared/ui/header-image"
import { reatomAsync, withCache, withDataAtom, withStatusesAtom } from "@reatom/async"
import { reatomComponent, useUpdate } from "@reatom/npm-react"
import { Button } from "@repo/ui/button"
import { Skeleton } from "@repo/ui/skeleton"
import { Typography } from "@repo/ui/typography"
import { IconExternalLink } from "@tabler/icons-react"

const mapImage = getStaticImage("arts/6.jpg")

type AvServer = { name: string, value: string, href: string, img: string }

const avServersAction = reatomAsync(async (ctx) => {
  return await ctx.schedule(() =>
    client<AvServer[]>("shared/servers-with-map").exec()
  )
}, "avServersAction").pipe(
  withDataAtom(null),
  withCache({ swr: false }),
  withStatusesAtom()
)

const ServersList = reatomComponent(({ ctx }) => {
  useUpdate(avServersAction, []);

  if (ctx.spy(avServersAction.statusesAtom).isPending) {
    return (
      <div className="flex w-full gap-2 items-center *:rounded-xl *:h-46 *:w-full">
        <Skeleton />
        <Skeleton />
      </div>
    )
  }

  const data = ctx.spy(avServersAction.dataAtom);
  if (!data) return null;

  return (
    <div className="flex w-full gap-2 items-center">
      {data.map((i) => (
        <div
          key={i.value}
          className="flex flex-col gap-4 w-full bg-neutral-900 rounded-xl p-4"
        >
          <Typography className='font-semibold text-base'>
            {i.name}
          </Typography>
          <Link href={i.href} target="_blank">
            <Button background="white" className="gap-2 py-1">
              <Typography className='font-semibold leading-6'>
                Перейти
              </Typography>
              <IconExternalLink size={16} />
            </Button>
          </Link>
        </div>
      ))}
    </div>
  )
}, 'ServersList')

export default function Page() {
  return (
    <div className="flex flex-col w-full h-full gap-6">
      <PageHeaderImage img={mapImage} />
      <div className="flex flex-col gap-4 h-full w-full">
        <Typography className="text-3xl font-semibold">
          Выбери сервер
        </Typography>
        <ServersList />
      </div>
    </div>
  )
}