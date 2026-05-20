import { reatomComponent, useUpdate } from "@reatom/npm-react";
import { Skeleton } from "@/shared/ui/skeleton";
import { Typography } from "@/shared/ui/typography"
import { type Option, optionsModel } from "../models/options.model";
import { atom } from "@reatom/framework";
import { Switch } from "@/shared/ui/switch";
import { tv } from "tailwind-variants";

const { options, optionsControl, getOptionIsLoading, optionsAtom } = optionsModel()

const optionItemVariant = tv({
  base: `flex border border-neutral-800 inert:pointer-events-none inert:opacity-60 h-10 rounded-lg px-2 items-center justify-between w-full gap-1`,
  slots: {
    label: "font-semibold"
  }
})

const OptionsListSkeleton = () => Array.from({ length: 3 }).map((_, idx) => (
  <div key={idx} className={optionItemVariant().base()}>
    <Skeleton className="w-36 h-6" />
    <Skeleton className="w-9 h-6 rounded-full" />
  </div>
))

const OptionItem = reatomComponent<Option>(({ ctx, name, title, value }) => {
  const isLoading = ctx.spy(getOptionIsLoading(name));

  return (
    <div
      className={optionItemVariant().base()}
    >
      <Typography className={optionItemVariant().label()}>{title}</Typography>
      <Switch
        checked={value}
        onCheckedChange={({ checked }) => optionsControl.update(ctx, name, checked)}
        isLoading={isLoading}
      />
    </div>
  )
}, "OptionItem")

const optionsArrayAtom = atom((ctx) => Array.from(ctx.spy(optionsAtom).values()))

const OptionsList = reatomComponent(({ ctx }) => {
  useUpdate(options.fetch, []);

  const data = ctx.spy(optionsArrayAtom)
  if (ctx.spy(options.fetch.statusesAtom).isPending) return <OptionsListSkeleton />

  if (!data) return null;

  return data.map((option) => <OptionItem key={option.name} {...option} />)
}, "OptionsList")

export const Options = () => {
  return (
    <div className="flex flex-col gap-2 w-full h-full">
      <OptionsList />
    </div>
  )
}
