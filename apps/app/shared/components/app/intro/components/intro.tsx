import { getStaticImage } from "@/shared/lib/volume-helpers";
import { onConnect, sleep } from "@reatom/framework";
import { reatomComponent } from "@reatom/npm-react";
import { Button } from "@/shared/ui/button";
import { Skeleton } from "@/shared/ui/skeleton";
import { Typography } from "@/shared/ui/typography"
import { serverStatus } from "../models/intro.model";
import { env } from "@/shared/env";
import { expImage } from "@/shared/consts/images";
import { pageState } from "@/shared/models/page-context.model";
import { translate } from "@/shared/locales/helpers";

onConnect(serverStatus.fetch.dataAtom, serverStatus.fetch)

onConnect(serverStatus.fetch.dataAtom, async (ctx) => {
  while (ctx.isConnected()) {
    await serverStatus.fetch.retry(ctx).catch(() => { })
    await ctx.schedule(() => sleep(60000))
  }
})

const IntroStatus = reatomComponent(({ ctx }) => {
  if (!ctx.spy(pageState.isClientside)) {
    return <Skeleton className="w-4 h-4 inline-flex rounded-sm" />
  }

  const data = ctx.spy(serverStatus.fetch.dataAtom);

  return (
    <Typography className="text-sm sm:text-lg">
      {data?.proxy.online ?? 0}
    </Typography>
  )
}, "IntroStatus")

const introImage = getStaticImage("images/village_pillage.webp");

export const Intro = () => {
  return (
    <div
      id="intro"
      className="flex flex-col items-center relative rounded-xl overflow-hidden w-full md:h-96 min-h-60 max-h-80"
    >
      <div className="absolute bg-gradient-to-r inset-0 w-full h-full from-black/80 via-black/40 to-transparent z-5" />
      <img
        src={introImage}
        fetchPriority="high"
        draggable={false}
        alt=""
        className="absolute select-none w-full h-full object-cover z-4"
      />
      <div className="flex flex-col z-6 justify-between p-3 md:p-4 grow lg:p-6 h-full w-full relative">
        <div className="flex flex-col items-start gap-4 w-full">
          <Typography className="text-base lg:text-xl font-semibold">
            {translate["index.intro.title"]()}
          </Typography>
          <Typography className="text-2xl lg:text-3xl font-[PIXY] leading-[1.1]">
            {translate["index.intro.subtitle"]()}
          </Typography>
          <Typography className="text-sm lg:text-base leading-tight truncate md:max-w-2/3 xl:max-w-2/5 text-wrap">
            {translate["index.intro.description"]()}
          </Typography>
        </div>
        <div className="flex flex-col gap-2 sm:gap-4 w-full items-start justify-end h-full">
          <div className="flex items-center gap-1">
            <img src={expImage} width={20} height={20} alt="" />
            <IntroStatus />
            <Typography className="text-sm sm:text-lg">
              {translate["index.intro.statusLabel"]()}
            </Typography>
          </div>
          <div className="flex gap-4 w-full items-center">
            <a href={`${env.VITE_LANDING_URL}/start`} target="_blank">
              <Button background="white">
                <Typography className="truncate text-nowrap text-sm lg:text-lg font-semibold">
                  {translate["index.intro.actionButton"]()}
                </Typography>
              </Button>
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}