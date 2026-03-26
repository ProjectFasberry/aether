import { reatomComponent } from "@reatom/npm-react";
import { Typography } from "@repo/ui/typography";
import { Checkbox, CheckboxProps } from "@repo/ui/checkbox"
import { AtomState, Ctx } from "@reatom/core";
import { onChange, storeCategoryAtom, storeItemsSearchQueryAtom, storeWalletFilterAtom } from "../../models/store.model";
import { IconFilter, IconSearch } from "@tabler/icons-react";
import { Sheet, SheetTrigger, SheetContent, SheetTitle } from "@repo/ui/sheet"
import { LabelHTMLAttributes } from "react";
import { isClientAtom } from "@/shared/models/page-context.model";
import { tv } from "tailwind-variants";
import { Input } from "@repo/ui/input";

export const storeSectionWrapper = tv({
  base: `bg-neutral-900 rounded-xl`,
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
  const isClient = ctx.spy(isClientAtom);
  const searchQuery = isClient ? ctx.spy(storeItemsSearchQueryAtom) : ""

  return (
    <div className={storeSectionWrapper({ className: "flex h-10 items-center justify-start w-full relative", variant: "reset" })}>
      <IconSearch size={18} className="text-neutral-400 absolute left-2 sm:left-4" />
      <Input
        value={searchQuery}
        placeholder="Найти..."
        className='bg-transparent w-full pl-8 sm:pl-12'
        onChange={e => onChange(ctx, e)}
        maxLength={1024}
      />
    </div>
  )
}, "StoreSearch")

const FILTERS = [
  {
    title: "Тип товара",
    origin: "category",
    atom: storeCategoryAtom,
    updater: (ctx: Ctx, value: string) => storeCategoryAtom(ctx, value as AtomState<typeof storeCategoryAtom>),
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

type FilterItem = {
  label?: LabelHTMLAttributes<HTMLLabelElement>,
  checkbox?: CheckboxProps,
  filterName: string
}

const FilterItem = ({ filterName, label: labelProps, checkbox: checkboxProps }: FilterItem) => {
  return (
    <label
      {...labelProps}
      className="flex items-center gap-2 bg-neutral-800 rounded-md p-2"
    >
      <Checkbox
        {...checkboxProps}
      />
      <Typography color="white" className="text-base">
        {filterName}
      </Typography>
    </label>
  )
}

export const StoreFilterList = reatomComponent(({ ctx }) => {
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
    <>
      {FILTERS.map((item) => (
        <div key={item.origin} className="flex flex-col gap-2">
          <Typography color="gray" className="text-lg">
            {item.title}
          </Typography>
          <div className='flex flex-col gap-2 w-full'>
            {item.filters.map((filter, idx) => (
              <FilterItem
                key={idx}
                label={{
                  htmlFor: getUniqueFilterId(item.origin, filter.value)
                }}
                checkbox={{
                  id: getUniqueFilterId(item.origin, filter.value),
                  checked: isClient ? ctx.spy(item.atom) === filter.value : false,
                  onCheckedChange: e => handle(item.updater, e, filter.value)
                }}
                filterName={filter.name}
              />
            ))}
          </div>
        </div>
      ))}
    </>
  )
}, "StoreFilterList")

export const StoreFiltersSheet = () => {
  return (
    <Sheet>
      <SheetTrigger className={storeSectionWrapper({ className: "flex w-full cursor-pointer h-full gap-2 items-center justify-center" })}>
        <IconFilter size={20} className="text-neutral-400" />
        <Typography color="gray" className="text-lg font-semibold">
          Изменить фильтры
        </Typography>
      </SheetTrigger>
      <SheetContent
        side="bottom"
        className='flex flex-col px-4 py-2 items-center justify-start max-h-[60vh] overflow-y-auto gap-4 rounded-t-xl'
      >
        <SheetTitle>Фильтры</SheetTitle>
        <div className='flex flex-col gap-2 w-full'>
          <StoreFilterList />
        </div>
      </SheetContent>
    </Sheet>
  )
}
