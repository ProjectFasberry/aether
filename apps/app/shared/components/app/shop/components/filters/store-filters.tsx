import { reatomComponent } from "@reatom/npm-react";
import { Typography } from "@repo/ui/typography";
import { Checkbox, CheckboxProps } from "@repo/ui/checkbox"
import { AtomMut, AtomState, Ctx } from "@reatom/core";
import { onChange, storeCategoryAtom, storeItemsSearchQueryAtom, storeWalletFilterAtom } from "../../models/store.model";
import { IconFilter, IconSearch } from "@tabler/icons-react";
import { LabelHTMLAttributes, useState } from "react";
import { isClientAtom } from "@/shared/models/page-context.model";
import { tv } from "tailwind-variants";
import { Input } from "@repo/ui/input";
import { Vaul, VaulContent, VaulHeader, VaulTrigger } from "@/shared/ui/vaul";

export const storeSectionWrapper = tv({
  base: ``,
  variants: {
    variant: {
      default: "p-2 sm:p-3 lg:p-4",
      reset: ""
    }
  },
  defaultVariants: {
    variant: "default"
  }
})

export const StoreSearch = reatomComponent(({ ctx }) => {
  const searchQuery = ctx.spy(isClientAtom) ? ctx.spy(storeItemsSearchQueryAtom) : ""

  return (
    <div className="flex h-10 items-center justify-start w-full relative">
      <IconSearch
        size={18}
        className="text-neutral-400 absolute left-2 sm:left-4"
      />
      <Input
        value={searchQuery}
        placeholder="Найти..."
        className='w-full pl-8 sm:pl-12'
        onChange={e => onChange(ctx, e)}
        maxLength={1024}
      />
    </div>
  )
}, "StoreSearch")

type Filter = {
  title: string,
  origin: string,
  atom: AtomMut<any>,
  updater: (ctx: Ctx, val: string) => void,
  filters: Array<{
    name: string, value: string,
  }>
}

const FILTERS: Filter[] = [
  {
    title: "Тип товара",
    origin: "category",
    atom: storeCategoryAtom,
    updater: (ctx: Ctx, value: string) =>
      storeCategoryAtom(ctx, value as AtomState<typeof storeCategoryAtom>),
    filters: [
      { name: "Все", value: "all" },
      { name: "Привилегии", value: "donate", },
      { name: "Ивенты", value: "event" },
    ]
  },
  {
    title: "Валюта",
    origin: "wallet",
    atom: storeWalletFilterAtom,
    updater: (ctx: Ctx, value: string) =>
      storeWalletFilterAtom(ctx, value as AtomState<typeof storeWalletFilterAtom>),
    filters: [
      { name: "Все", value: "ALL", },
      { name: "Харизма", value: "CHARISM" },
      { name: "Белкоин", value: "BELKOIN", }
    ]
  }
]

type FilterItemProps = {
  label?: LabelHTMLAttributes<HTMLLabelElement>,
  checkbox?: CheckboxProps,
  filterName: string
}

const FilterItem = ({ filterName, label: labelProps, checkbox: checkboxProps }: FilterItemProps) => {
  return (
    <label
      {...labelProps}
      className="flex items-center gap-2 bg-neutral-700 rounded-lg p-2"
    >
      <Checkbox {...checkboxProps} />
      <Typography color="white" className="text-base">
        {filterName}
      </Typography>
    </label>
  )
}

const StoreFilterItem = reatomComponent<Filter>(({
  ctx, title, filters, atom, updater
}) => {
  const isClient = ctx.spy(isClientAtom)

  const handle = (
    updater: (ctx: Ctx, value: string) => void,
    isChecked: string | boolean,
    target: string
  ) => {
    if (typeof isChecked !== 'boolean') return;

    updater(ctx, isChecked ? target : "ALL");
  }

  const getUniqueFilterId = (v1: string, v2: string) => `${v1}${v2}`

  return (
    <div className="flex flex-col gap-2">
      <Typography className="text-neutral-400 text-lg">
        {title}
      </Typography>
      <div className='flex flex-col gap-2 w-full'>
        {filters.map((filter, idx) => (
          <FilterItem
            key={idx}
            label={{
              htmlFor: getUniqueFilterId(origin, filter.value)
            }}
            checkbox={{
              id: getUniqueFilterId(origin, filter.value),
              checked: isClient ? ctx.spy(atom) === filter.value : false,
              onCheckedChange: e => handle(updater, e, filter.value)
            }}
            filterName={filter.name}
          />
        ))}
      </div>
    </div>
  )
}, "StoreFilterItem")

export const StoreFilterList = reatomComponent(({ ctx }) =>
  FILTERS.map((item) => <StoreFilterItem key={item.origin} {...item} />),
  "StoreFilterList"
)

export const StoreFiltersSheet = () => {
  const [open, setOpen] = useState(false);

  return (
    <Vaul open={open} onOpenChange={setOpen}>
      <VaulTrigger>
        <div className={storeSectionWrapper({ className: "flex w-full cursor-pointer h-full gap-2 items-center justify-center" })}>
          <IconFilter size={20} className="text-neutral-400" />
          <Typography color="gray" className="text-lg font-semibold">
            Изменить фильтры
          </Typography>
        </div>
      </VaulTrigger>
      <VaulContent>
        <VaulHeader title="Фильтр" />
        <div className='flex flex-col gap-6 w-full'>
          <StoreFilterList />
        </div>
      </VaulContent>
    </Vaul>
  )
}