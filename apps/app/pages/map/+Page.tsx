import { Link } from "@/shared/components/config/link"
import { client } from "@/shared/lib/client-wrapper"
import { createPageModel } from "@/shared/lib/events"
import { getStaticImage } from "@/shared/lib/volume-helpers"
import { translate } from "@/shared/locales/helpers"
import { PageHeaderImage } from "@/shared/ui/header-image"
import { atom, reatomAsync, withAbort, withAssign, withCache, withDataAtom, withStatusesAtom } from "@reatom/framework"
import { reatomComponent, useAtom } from "@reatom/npm-react"
import { Button } from "@/shared/ui/button"
import { Skeleton } from "@/shared/ui/skeleton"
import { Typography } from "@/shared/ui/typography"
import { IconExternalLink } from "@tabler/icons-react"

const mapImage = getStaticImage("arts/6.jpg")

type AvailableServersPayload = ExtractApiData<"getSharedServers-with-map">["data"]

const availableServers = atom(null, "availableServers").pipe(
  withAssign((_, name) => ({
    fetch: reatomAsync(async (ctx) => {
      return await ctx.schedule(() =>
        client<AvailableServersPayload>("shared/servers-with-map", { signal: ctx.controller.signal }).exec()
      )
    }, {
      name: `${name}.fetch`
    }).pipe(
      withDataAtom(null),
      withCache({ swr: false }),
      withStatusesAtom(),
      withAbort()
    )
  }))
)

const ServersList = reatomComponent(({ ctx }) => {
  if (ctx.spy(availableServers.fetch.statusesAtom).isPending) {
    return (
      <div className="flex w-full gap-2 items-center *:rounded-xl *:h-46 *:w-full">
        <Skeleton />
        <Skeleton />
      </div>
    )
  }

  const data = ctx.spy(availableServers.fetch.dataAtom);
  if (!data) return null;

  return (
    <div className="flex w-full gap-2 items-center">
      {data.map((server, idx) => (
        <div
          key={idx}
          className="flex flex-col gap-4 w-full bg-neutral-900 rounded-xl p-4"
        >
          <Typography className='font-semibold text-base'>
            {server.name}
          </Typography>
          <Link href={server.href} target="_blank">
            <Button background="white" className="gap-2 py-1">
              <Typography className='font-semibold leading-6'>
                {translate["map.goTo"]()}
              </Typography>
              <IconExternalLink size={16} />
            </Button>
          </Link>
        </div>
      ))}
    </div>
  )
}, 'ServersList')

const page = createPageModel({
  name: "map",
  onConnAction: (ctx) => {
    availableServers.fetch(ctx)
  },
  onDisconnAction: (ctx) => {
    availableServers.fetch.abort(ctx)
  }
})

export default function Page() {
  const [_] = useAtom(page.dataAtom);
  
  return (
    <div className="flex flex-col w-full h-full gap-6">
      <PageHeaderImage img={mapImage} />
      <div className="flex flex-col gap-4 h-full w-full">
        <Typography className="text-3xl font-semibold">
          {translate["map.title"]()}
        </Typography>
        <ServersList />
      </div>
    </div>
  )
}