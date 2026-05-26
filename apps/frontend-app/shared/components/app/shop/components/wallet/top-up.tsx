import { reatomComponent } from "@reatom/npm-react";
import { Input } from "@/shared/ui/input";
import { Typography } from "@/shared/ui/typography"
import { topup, topupErrorAtom, type TopupMethodListPayload, topupNavigationModel, topupState, type TopupType } from "../../models/store-top-up.model";
import { Button } from "@/shared/ui/button";
import { Skeleton } from "@/shared/ui/skeleton";
import { IconCheck, IconExchange, IconSelector, IconX } from "@tabler/icons-react";
import { belkoinImage, charismImage } from "@/shared/consts/images";
import { isEmptyArray } from "@/shared/lib/helpers";
import React, { type ReactNode } from "react";
import { type Ctx, spawn } from "@reatom/framework";
import { IconLoader } from "@/shared/ui/icon-loader";
import { ErrorBlock } from "@/shared/ui/error-block";
import { Select, createListCollection } from '@ark-ui/react/select'
import { Portal } from "@ark-ui/react/portal";
import {
  selectClearTriggerVariant, selectContentBaseStyle, selectContentVariant, selectControlVariant,
  selectIndicatorsVariant, selectIndicatorVariant, selectItemGroupVariant, selectItemIndicatorVariant,
  selectItemTextVariant, selectItemVariant, selectTriggerVariant
} from "@/shared/ui/select"
import { TARGET_TITLE } from "@/shared/consts/store";

type TopupTargetProps = {
  variant?: "compact", title?: never, img: string
} | {
  variant?: "full", title: string, img: string
}

const TopUpTarget = reatomComponent<TopupTargetProps>(({ img, variant = "compact", title }) => {
  return (
    <div className="flex items-center w-full gap-2">
      <img src={img} className="h-6 min-w-6 min-h-6 w-6 object-cover" alt="" />
      {variant === 'full' && (
        <p className="leading-5 font-medium text-sm">{title}</p>
      )}
    </div>
  )
}, "TopUpTarget")

const TopUpError = reatomComponent(({ ctx }) => {
  const msg = ctx.spy(topupErrorAtom)?.message
  if (!msg) return null;
  return <ErrorBlock title={msg} />
}, "TopUpError")

const TopUpMethod = reatomComponent<{ method: TopupMethodListPayload[number] }>(({ ctx, method }) => {
  const current = ctx.spy(topupState.method.type);
  if (!current) return null;

  return (
    <Button
      background={current.value === method.value ? "white" : "default"}
      onClick={() => topupState.method.type(ctx, method)}
      className="gap-2 h-12"
    >
      <img src={method.imageUrl} className="min-h-6 min-w-6 rounded-lg h-6 w-6 object-cover" alt="" />
      {method.title}
    </Button>
  )
}, "TopUpMethod")

const TopUpMethods = reatomComponent(({ ctx }) => {
  if (ctx.spy(topup.fetchMethods.statusesAtom).isPending) {
    return Array.from({ length: 3 }).map((_, idx) => <Skeleton key={idx} className="h-12 w-full" />)
  }

  const data = ctx.spy(topup.fetchMethods.dataAtom);
  if (!data) return null;

  return data.map((method) => <TopUpMethod key={method.id} method={method} />)
}, 'TopUpMethods')

const TopUpRecipient = reatomComponent(({ ctx }) => {
  return (
    <Input
      value={ctx.spy(topupState.recipient)}
      onChange={e => topupState.recipient(ctx, e.target.value)}
      placeholder="Никнейм"
      maxLength={128}
    />
  )
}, "TopUpRecipient")

const TopUpCurrencies = reatomComponent(({ ctx }) => {
  const data = ctx.spy(topupState.method.type)?.currencies;
  if (!data || ctx.spy(topup.fetchMethods.statusesAtom).isPending) return null;

  const collection = createListCollection({
    items: data,
  })

  const item = ctx.spy(topupState.method.currency)

  return (
    <Select.Root
      collection={collection}
      value={item ? [item] : []}
      onValueChange={({ value }) => topupState.method.currency(ctx, value[0])}
    >
      <Select.Control className={selectControlVariant()}>
        <Select.Trigger className={selectTriggerVariant()}>
          <Select.ValueText placeholder="Не выбрано" />
        </Select.Trigger>
        <div className={selectIndicatorsVariant()}>
          <Select.ClearTrigger className={selectClearTriggerVariant()}>
            <IconX size={20} />
          </Select.ClearTrigger>
          <Select.Indicator className={selectIndicatorVariant()}>
            <IconSelector size={20} />
          </Select.Indicator>
        </div>
      </Select.Control>
      <Portal>
        <Select.Positioner>
          <Select.Content className={selectContentVariant()} style={selectContentBaseStyle}>
            <Select.ItemGroup className={selectItemGroupVariant()}>
              {data?.map((item, idx) => (
                <Select.Item key={idx} item={item} className={selectItemVariant()}>
                  <Select.ItemText className={selectItemTextVariant()}>
                    {item}
                  </Select.ItemText>
                  <Select.ItemIndicator className={selectItemIndicatorVariant()}>
                    <IconCheck size={16} />
                  </Select.ItemIndicator>
                </Select.Item>
              ))}
            </Select.ItemGroup>
          </Select.Content>
        </Select.Positioner>
      </Portal>
      <Select.HiddenSelect />
    </Select.Root>
  )
}, "TopUpCurrencies")

const BUTTONS = [
  {
    label: "Назад",
    bgVariant: "default",
    cdAtom: topupNavigationModel.canGoBackAtom,
    cb: (ctx: Ctx) => spawn(ctx, (spawnCtx) => topupNavigationModel.back(spawnCtx))
  },
  {
    label: "Продолжить",
    bgVariant: "positive",
    cdAtom: topupNavigationModel.canGoNextAtom,
    cb: (ctx: Ctx) => spawn(ctx, (spawnCtx) => topupNavigationModel.next(spawnCtx))
  }
] as const

const TopupNavigation = reatomComponent(({ ctx }) => {
  const isLast = ctx.spy(topupNavigationModel.isLastStepAtom)
  if (isLast) return null;

  return (
    <div className="flex items-center gap-2 w-full *:w-full">
      {BUTTONS.map((button, idx) => (
        <Button
          key={idx}
          type="button"
          disabled={!ctx.spy(button.cdAtom)}
          background={button.bgVariant}
          onClick={() => button.cb(ctx)}
        >
          {button.label}
        </Button>
      ))}
    </div>
  )
}, "TopUpSubmit")

const ExchangeItem = ({ type, values }: { type: string, values: Record<string, number> }) => {
  return (
    <div className="flex flex-col w-full gap-2">
      <div className="flex bg-neutral-800 justify-between px-4 h-10 rounded-lg cursor-pointer items-center gap-2 w-full">
        <Typography className="text-lg leading-5">
          {TARGET_TITLE[type as keyof typeof TARGET_TITLE]}
        </Typography>
        <IconExchange size={16} className="text-neutral-400" />
      </div>
      <div className="flex flex-col gap-2 w-full h-full">
        <Typography color="gray">Курс на текущий момент</Typography>
        <div className='flex flex-col gap-1 w-full'>
          {Object.entries(values).map(([currency, value]) => (
            <div key={currency}>~ {value.toFixed(2)} {currency}</div>
          ))}
        </div>
      </div>
    </div>
  )
}
export const TopUpExchanges = reatomComponent(({ ctx }) => {
  if (ctx.spy(topup.fetchExchange.statusesAtom).isPending) {
    return Array.from({ length: 3 }).map((_, idx) => <Skeleton key={idx} className="h-12 w-full" />)
  }

  const data = ctx.spy(topup.fetchExchange.dataAtom);
  if (!data || isEmptyArray(data)) return null;

  return data.map((entry) => <ExchangeItem key={entry.type} {...entry} />)
}, "TopUpExchanges")

const WALLETS_IMGS: Record<string, string> = { "CHARISM": charismImage, "BELKOIN": belkoinImage }

const TopupValue = reatomComponent(({ ctx }) => {
  const collection = createListCollection({
    items: topupState.WALLETS,
  })

  return (
    <div className="flex w-full justify-between gap-1 items-center">
      <Input
        maxLength={8}
        className="w-full"
        placeholder="Количество валюты"
        value={ctx.spy(topupState.value)}
        onChange={e => topupState.value.onChangeEvent(ctx, e)}
      />
      <Select.Root
        collection={collection}
        value={[ctx.spy(topupState.wallet)]}
        onValueChange={({ value }) => topupState.wallet(ctx, value[0])}
        className="min-w-36"
      >
        <Select.Control className={selectControlVariant({ className: "w-full" })}>
          <Select.Trigger className={selectTriggerVariant()}>
            <Select.ValueText className="w-fit">
              <TopUpTarget img={WALLETS_IMGS[ctx.spy(topupState.wallet)]} />
            </Select.ValueText>
          </Select.Trigger>
          <div className={selectIndicatorsVariant()}>
            <Select.Indicator className={selectIndicatorVariant()}>
              <IconSelector size={20} />
            </Select.Indicator>
          </div>
        </Select.Control>
        <Portal>
          <Select.Positioner>
            <Select.Content className={selectContentVariant()}>
              <Select.ItemGroup className={selectItemGroupVariant()}>
                {topupState.WALLETS.map((wallet) => (
                  <Select.Item key={wallet.value} item={wallet} className={selectItemVariant()}>
                    <TopUpTarget variant="full" title={wallet.title} img={WALLETS_IMGS[wallet.value]} />
                  </Select.Item>
                ))}
              </Select.ItemGroup>
            </Select.Content>
          </Select.Positioner>
        </Portal>
        <Select.HiddenSelect />
      </Select.Root>
    </div>
  )
}, "TopupValue")

const TopupConfirm = reatomComponent(({ ctx }) => {
  if (ctx.spy(topup.submit.statusesAtom).isPending) return <IconLoader />

  const error = ctx.spy(topupErrorAtom)
  const data = ctx.spy(topup.submit.dataAtom)
  const isSuccess = data && !error;

  const title = isSuccess ? `Заказ был создан` : `Заказ не был создан`

  return (
    <div className="flex flex-col items-center justify-center w-full gap-4">
      <div className="flex flex-col gap-2 bg-neutral-900 min-h-36 rounded-xl w-full h-full items-center justify-center">
        {isSuccess ? (
          <IconCheck size={36} className='text-green-400' />
        ) : (
          <IconX size={36} className="text-red" />
        )}
        <Typography className="text-lg font-semibold">{title}</Typography>
      </div>
      {isSuccess ? (
        <Button
          type="button"
          background="default"
          onClick={() => topup.toOrder(ctx, data.uniqueId)}
          className="font-semibold"
        >
          К заказу
        </Button>
      ) : (
        <Button
          background="default"
          className='px-4 w-fit font-semibold'
          onClick={() => topup.resetAll(ctx)}
        >
          Вернуться
        </Button>
      )}
    </div>
  )
}, "TopupConfirm")

const COMPONENTS: Record<TopupType, ReactNode> = {
  "start-input": (
    <div className="flex flex-col gap-2 w-full">
      <TopUpRecipient />
      <TopupValue />
    </div>
  ),
  "select-method": (
    <div className="flex flex-col gap-4 w-full">
      <div className="flex flex-col gap-2 w-full">
        <Typography className="text-lg font-semibold">
          Выберите метод оплаты и валюту
        </Typography>
        <div className="grid sm:grid-cols-3 grid-cols-1 auto-rows-auto gap-2 w-full h-full">
          <TopUpMethods />
        </div>
      </div>
      <TopUpCurrencies />
    </div>
  ),
  "confirm": <TopupConfirm />
}

const TopupFormContent = reatomComponent(({ ctx }) => COMPONENTS[ctx.spy(topupState.type)], "TopupFormContent")

export const TopupForm = reatomComponent(({ ctx }) => {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    spawn(ctx, (spawnCtx) => topupNavigationModel.next(spawnCtx))
  }

  return (
    <form className="flex flex-col gap-8 w-full sm:w-[60%] h-full" onSubmit={handleSubmit}>
      <div className="flex items-center justify-center w-full h-full">
        <TopupFormContent />
      </div>
      <TopUpError />
      <TopupNavigation />
    </form>
  )
}, "TopupForm")
