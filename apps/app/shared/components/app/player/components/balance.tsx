import { reatomComponent, useUpdate } from "@reatom/npm-react";
import { Typography } from "@repo/ui/typography";
import { Button } from "@repo/ui/button";
import { getStaticImage } from "@/shared/lib/volume-helpers";
import { IconPencil, IconPlus, IconSettings } from "@tabler/icons-react";
import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui/popover";
import { Switch } from "@repo/ui/switch";
import { balance, balanceState } from "../models/balance.model";
import { AnimatedNumber } from "@repo/ui/animated-number"
import { navigate } from "vike/client/router";
import { appState } from "@/shared/models/app.model";
import { belkoinImage, charismImage } from "@/shared/consts/images";
import { isClientAtom } from "@/shared/models/page-context.model";
import { Skeleton } from "@repo/ui/skeleton";
import { scrollableVariant } from "@/shared/consts/style-variants";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@repo/ui/dropdown-menu";

const cardImage = getStaticImage("arts/steve_night.jpg")

const animateOptions = {
  bounce: 0,
  duration: 2000,
}

type BalanceCardProps = {
  balance: number,
  value: string,
  image: string
}

const CardValue = reatomComponent<{ balance: number }>(({ ctx, balance }) => {
  const animate = ctx.spy(balanceState.settings.animateBalance);

  return (
    <div className="inline-flex items-center text-neutral-50 text-2xl font-light">
      {animate ? (
        <AnimatedNumber springOptions={animateOptions} value={balance} />
      ) : (
        <span>{balance}</span>
      )}
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
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className="px-2 py-0.5 gap-1" background="white">
          <Typography className="text-nowrap">
            Сервер:
          </Typography>
          <Typography className="text-nowrap capitalize">
            {current}
          </Typography>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <div className="flex flex-col p-2 gap-2 w-full">
          <Typography className="text-sm text-neutral-400">
            Сервера
          </Typography>
          <div className="flex flex-col gap-1 w-full">
            {SERVERS.map((server) => (
              <DropdownMenuItem
                key={server.value}
                data-state={current === server.value ? "active" : "inactive"}
                className="p-0 text-base group"
                asChild
              >
                <Button
                  className="py-1"
                  onClick={() => balanceState.targetServer(ctx, server.value)}
                  disabled={ctx.spy(balance.fetch.statusesAtom).isPending}
                >
                  <Typography
                    className="capitalize 
                      group-data-[state=active]:text-green-500 group-data-[state=inactive]:text-neutral-50"
                  >
                    {server.value}
                  </Typography>
                </Button>
              </DropdownMenuItem>
            ))}
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}, "BalanceServerSelect")

const BalanceCard = reatomComponent<BalanceCardProps>(({ ctx, balance, value, image }) => {
  const title = appState.dict.get(ctx, value)
  const isLoading = !ctx.spy(isClientAtom)

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
          {value === 'CHARISM' && <BalanceServerSelect />}
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
            {isLoading ? <Skeleton className="h-8 w-24" /> : <CardValue balance={balance} />}
          </div>
          <Button
            background="white"
            className="p-1"
            onClick={() => navigate(`/store/cart/topup?target=${value}`)}
          >
            <IconPlus size={24} className="text-neutral-950" />
          </Button>
        </div>
      </div>
    </div>
  )
}, "BalanceCard")

const BelkoinCard = reatomComponent(({ ctx }) => (
  <BalanceCard
    balance={ctx.spy(balanceState.belkoinBalance)}
    value="BELKOIN"
    image={belkoinImage}
  />
), "BelkoinCard")

const CharismCard = reatomComponent(({ ctx }) => (
  <BalanceCard
    balance={ctx.spy(balanceState.charismBalance)}
    value="CHARISM"
    image={charismImage}
  />
), "CharismCard")

const BalanceSettingsDesign = reatomComponent(({ ctx }) => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button background="default" className="p-1">
          <IconPencil size={18} className="text-neutral-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" side="bottom">
        <div className="flex flex-col gap-2 w-full h-full">
          <Typography className="text-neutral-400 text-md">
            Дизайн
          </Typography>
          <Typography>недоступно</Typography>
        </div>
      </PopoverContent>
    </Popover>
  )
}, "BalanceSettingsDesign")

const BalanceSettingsOptions = reatomComponent(({ ctx }) => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button background="default" className="p-1">
          <IconSettings size={18} className="text-neutral-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" side="bottom">
        <div className="flex flex-col gap-2 w-full h-full">
          <Typography className="text-neutral-400 text-md">
            Особенности
          </Typography>
          <div className="flex flex-col w-full h-full">
            <div className="flex items-center justify-between gap-1 w-full">
              <Typography className="cursor-pointer text-neutral-100">
                Показывать анимацию
              </Typography>
              <Switch
                checked={ctx.spy(balanceState.settings.animateBalance)}
                onCheckedChange={v => balanceState.settings.animateBalance(ctx, v)}
              />
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
})

const BalanceSettings = () => {
  return (
    <div className="flex items-center gap-2 border border-neutral-800 rounded-xl px-2 py-1">
      <BalanceSettingsOptions />
      <BalanceSettingsDesign />
    </div>
  )
}

export const Balance = () => {
  useUpdate(balance.fetch, [])

  return (
    <div className="flex flex-col gap-2 w-full">
      <div className="flex items-center justify-between w-full">
        <Typography className="text-2xl font-semibold">
          Баланс:
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