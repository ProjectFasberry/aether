import { reatomComponent, useUpdate } from "@reatom/npm-react";
import { Typography } from "@/shared/ui/typography"
import { Button } from "@/shared/ui/button";
import { getStaticImage } from "@/shared/lib/volume-helpers";
import { IconPlus, IconSettings } from "@tabler/icons-react";
import { balance, balanceState } from "../models/balance.model";
import { navigate } from "vike/client/router";
import { getFromDictionary } from "@/shared/models/app/utils";
import { belkoinImage, charismImage } from "@/shared/consts/images";
import { pageState } from "@/shared/models/page-context.model";
import { Skeleton } from "@/shared/ui/skeleton";
import { scrollableVariant } from "@/shared/consts/style-variants";
import NumberFlow from '@number-flow/react'
import { translate } from "@/shared/locales/helpers";
import { Switch } from "@/shared/ui/switch";
import { Menu } from '@ark-ui/react/menu'
import { HoverCard } from '@ark-ui/react/hover-card'
import { Portal } from '@ark-ui/react/portal'

const cardImage = getStaticImage("arts/steve_night.jpg")

type BalanceCardProps = {
  value: number,
  wallet: string,
  image: string
}

const CardValue = reatomComponent<{ value: number }>(({ ctx, value }) => {
  const animate = ctx.spy(balanceState.settings.animateBalance);

  return (
    <div className="inline-flex items-center text-neutral-50 text-2xl font-light">
      <NumberFlow animated={animate} value={value} trend={0} format={{ notation: "standard" }} />
    </div>
  )
}, "CardValue")

const SERVERS = [
  { value: "bisquite" },
  { value: "muffin" }
]

const BalanceServerSelect = reatomComponent(({ ctx }) => {
  const current = ctx.spy(balanceState.targetServer);

  return (
    <>
      <Menu.Root
        onSelect={details => {
          balanceState.targetServer(ctx, details.value)
        }}
      >
        <Menu.Trigger asChild>
          <Menu.Indicator />
          <Button className="py-0.5 px-2" background="default">
            Сервер:&nbsp;
            <span className="text-nowrap text-sm capitalize text-neutral-400">{current}</span>
          </Button>
        </Menu.Trigger>
        <Menu.Positioner>
          <Menu.Content>
            <Menu.Arrow>
              <Menu.ArrowTip />
            </Menu.Arrow>
            <div
              className="min-w-[140px] flex-col gap-2 bg-neutral-900 p-2 flex rounded-xl items-center justify-center"
            >
              <Typography className="text-sm" color="gray">
                Доступные сервера:
              </Typography>
              <div className="flex flex-col gap-1 w-full">
                {SERVERS.map((server) => (
                  <Menu.Item key={server.value} value={server.value} asChild>
                    <Button
                      data-state={current === server.value ? "active" : "inactive"}
                      className="text-base hover:bg-neutral-800 justify-start group py-1 px-2"
                      disabled={ctx.spy(balance.fetch.statusesAtom).isPending}
                    >
                      <Typography
                        className="capitalize text-sm
                      group-data-[state=active]:text-green-500 group-data-[state=inactive]:text-neutral-50"
                      >
                        {server.value}
                      </Typography>
                    </Button>
                  </Menu.Item>
                ))}
              </div>
              <Menu.Separator />
            </div>
          </Menu.Content>
        </Menu.Positioner>
      </Menu.Root>
    </>
  )
}, "BalanceServerSelect")

const BalanceCard = reatomComponent<BalanceCardProps>(({ ctx, value, wallet, image }) => {
  const title = getFromDictionary(ctx, wallet)
  const isLoading = !ctx.spy(pageState.isClientside) || ctx.spy(balance.fetch.statusesAtom).isPending

  return (
    <div className="relative rounded-2xl min-w-80 overflow-hidden w-full h-56">
      <img
        src={cardImage}
        className="object-bottom object-cover select-none w-full h-full"
        alt=""
        draggable={false}
      />
      <div className="absolute inset-0 select-none">
        <div className="absolute inset-0 backdrop-blur-[4px] bg-black/10"></div>
        <div className="absolute inset-y-1/2 bottom-0 backdrop-blur-sm bg-black/20"></div>
        <div className="absolute inset-y-1/3 bottom-0 backdrop-blur-[10px] bg-black/40"></div>
      </div>
      <div className="absolute inset-0 flex flex-col justify-between p-6 z-[5]">
        <div className="flex items-center justify-between w-full">
          <Typography className="select-none font-semibold text-neutral-50 text-xl">
            {title}
          </Typography>
          {wallet === 'CHARISM' && <BalanceServerSelect />}
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <img
              src={image}
              width={28}
              height={28}
              alt=""
              draggable={false}
              className='select-none'
            />
            {isLoading ? <Skeleton className="h-8 w-24" /> : <CardValue value={value} />}
          </div>
          <Button
            background="white"
            className="p-0"
            onClick={() => navigate(`/store/cart/topup?target=${value}`)}
          >
            <IconPlus size={20} className="text-neutral-950" />
          </Button>
        </div>
      </div>
    </div>
  )
}, "BalanceCard")

const BelkoinCard = reatomComponent(({ ctx }) => (
  <BalanceCard value={ctx.spy(balanceState.belkoinBalance)} wallet="BELKOIN" image={belkoinImage} />
), "BelkoinCard")

const CharismCard = reatomComponent(({ ctx }) => (
  <BalanceCard value={ctx.spy(balanceState.charismBalance)} wallet="CHARISM" image={charismImage} />
), "CharismCard")

const BalanceSettingsOptions = reatomComponent(({ ctx }) => {
  return (
    <>
      <HoverCard.Root positioning={{ placement: "bottom-end" }}>
        <HoverCard.Trigger>
          <Button background="default" className="p-1">
            <IconSettings size={18} className="text-neutral-50" />
          </Button>
        </HoverCard.Trigger>
        <HoverCard.Positioner>
          <HoverCard.Arrow>
            <HoverCard.ArrowTip />
          </HoverCard.Arrow>
          <HoverCard.Content>
            <div className="flex flex-col gap-2 w-full h-full">
              <Typography className="text-neutral-400 text-md">
                {translate['player.balance.settings.title']()}
              </Typography>
              <div className="flex flex-col w-full h-full">
                <div className="flex items-center justify-between gap-1 w-full">
                  <Typography className="cursor-pointer text-neutral-100">
                    {translate["player.balance.settings.variants.animation"]()}
                  </Typography>
                  <Switch
                    checked={ctx.spy(balanceState.settings.animateBalance)}
                    onCheckedChange={v => balanceState.settings.animateBalance(ctx, v)}
                  />
                </div>
              </div>
            </div>
          </HoverCard.Content>
        </HoverCard.Positioner>
      </HoverCard.Root>
    </>
  )
}, "BalanceSettingsOptions")

const BalanceSettings = () => {
  return (
    <div className="flex items-center gap-2 border border-neutral-800 rounded-xl px-2 py-1">
      <BalanceSettingsOptions />
      {/* <BalanceSettingsDesign /> */}
    </div>
  )
}

export const Balance = () => {
  useUpdate(balance.fetch, [])

  return (
    <div className="flex flex-col gap-2 w-full">
      <div className="flex items-center justify-between w-full">
        <Typography className="text-2xl font-semibold">
          {translate["player.balance.title"]()}
        </Typography>
        <BalanceSettings />
      </div>
      <div
        className={scrollableVariant({
          className: `flex items-center h-full pb-2 justify-start scrollbar-h-2 overflow-x-auto w-full gap-2`
        })}
      >
        <CharismCard />
        <BelkoinCard />
      </div>
    </div>
  )
}