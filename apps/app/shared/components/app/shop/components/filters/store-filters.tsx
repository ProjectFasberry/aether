import { reatomComponent } from "@reatom/npm-react";
import { Typography } from "@repo/ui/typography";
import { Checkbox, CheckboxProps } from "@repo/ui/checkbox"
import { Ctx } from "@reatom/core";
import { Filter, filterIsAppliedAtom, filtersState, storeItems, storeItemsState } from "../../models/store.model";
import { IconFilter, IconSearch } from "@tabler/icons-react";
import { LabelHTMLAttributes, useState } from "react";
import { isClientAtom } from "@/shared/models/page-context.model";
import { Input } from "@repo/ui/input";
import { Vaul, VaulContent, VaulHeader, VaulTrigger } from "@/shared/ui/vaul";
import { appState } from "@/shared/models/app.model";

export const StoreSearch = reatomComponent(({ ctx }) => {
  const searchQuery = ctx.spy(isClientAtom) 
    ? ctx.spy(storeItemsState.filters.searchQuery) 
    : storeItemsState.filters.all.get(ctx, "searchQuery")

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
        onChange={e => storeItems.onChangeEvent(ctx, e)}
        maxLength={1024}
      />
    </div>
  )
}, "StoreSearch")

type FilterItemProps = {
  label?: LabelHTMLAttributes<HTMLLabelElement>,
  checkbox?: CheckboxProps,
  filterName: string
}

const FilterItem = ({ filterName, label: labelProps, checkbox: checkboxProps }: FilterItemProps) => {
  return (
    <label
      {...labelProps}
      className="flex items-center gap-2 bg-neutral-800 rounded-lg p-2"
    >
      <Checkbox {...checkboxProps} />
      <Typography color="white" className="text-base">
        {filterName}
      </Typography>
    </label>
  )
}

const StoreFilterItem = reatomComponent<Omit<Filter, "atom">>(({
  ctx, title, filters, updater, origin
}) => {
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
              checked: ctx.spy(
                filterIsAppliedAtom({ origin, currValue: filter.value })
              ),
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
  ctx.spy(filtersState.data).map((item) => <StoreFilterItem key={item.origin} {...item} />),
  "StoreFilterList"
)

export const StoreFiltersSheet = reatomComponent(({ctx}) => {
  const [open, setOpen] = useState(false);

  const isMobile = ctx.spy(appState.isMobile)
  if (!isMobile) return null;

  return (
    <Vaul open={open} onOpenChange={setOpen}>
      <VaulTrigger>
        <div className="flex bg-neutral-800 items-center justify-center rounded-xl h-10 aspect-square p-2 sm:p-3 lg:p-4">
          <IconFilter size={20} className="text-neutral-400" />
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
}, "StoreFiltersSheet")