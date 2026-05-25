import { reatomComponent, useUpdate } from "@reatom/npm-react";
import { Typography } from "@/shared/ui/typography"
import { Button } from "@/shared/ui/button";
import { getStaticImage } from "@/shared/lib/volume-helpers";
import { IconPlus } from "@tabler/icons-react";
import { balance, balanceState } from "../models/balance.model";
import { navigate } from "vike/client/router";
import { getFromDictionary } from "@/shared/models/app/utils";
import { belkoinImage, charismImage } from "@/shared/consts/images";
import { pageState } from "@/shared/models/page-context.model";
import { Skeleton } from "@/shared/ui/skeleton";
import { scrollableVariant } from "@/shared/consts/style-variants";
import NumberFlow from '@number-flow/react'
import { translate } from "@/shared/locales/helpers";
import { Menu } from '@ark-ui/react/menu'
import { menuArrowVariant, menuContentVariant } from "@/shared/ui/menu";

const cardImage = getStaticImage("arts/steve_night.jpg")

type BalanceCardProps = { value: number, wallet: string, image: string }

const CardValue = reatomComponent<{ value: number }>(({ ctx, value }) => {
  const animate = ctx.spy(balanceState.settings.animateBalance);

  return (
    <div className="inline-flex items-center text-neutral-50 text-2xl font-light">
      <NumberFlow animated={animate} value={value} trend={0} format={{ notation: "standard" }} />
    </div>
  )
}, "CardValue")

const SERVERS = [{ value: "bisquite" }, { value: "muffin" }]

const BalanceServerSelect = reatomComponent(({ ctx }) => {
  const current = ctx.spy(balanceState.targetServer);

  return (
    <Menu.Root
      onSelect={details => balanceState.targetServer(ctx, details.value)}
    >
      <Menu.Trigger asChild>
        <Button className="py-0.5 px-2" background="default">
          Сервер:&nbsp;
          <span className="text-nowrap text-sm capitalize text-neutral-400">
            {current}
          </span>
        </Button>
      </Menu.Trigger>
      <Menu.Positioner>
        <Menu.Content className={menuContentVariant({ className: "min-w-[140px]" })}>
          <Menu.Arrow className={menuArrowVariant()}>
            <Menu.ArrowTip className={menuArrowVariant()} />
          </Menu.Arrow>
          <div className="flex flex-col gap-2 items-center justify-center w-full">
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
          </div>
        </Menu.Content>
      </Menu.Positioner>
    </Menu.Root>
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

export const Balance = () => {
  useUpdate(balance.fetch, [])

  return (
    <div className="flex flex-col gap-2 w-full">
      <div className="flex items-center justify-between w-full">
        <Typography className="text-2xl font-semibold">
          {translate["player.balance.title"]()}
        </Typography>
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