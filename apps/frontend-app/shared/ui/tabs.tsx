import { tv } from "tailwind-variants";

const tabsTriggerVariants = tv({
  base: `
    relative inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-xl border 
    border-neutral-700 px-2 py-0.5 text-base font-medium whitespace-nowrap transition-all group-data-vertical/tabs:w-full 
    group-data-vertical/tabs:justify-start focus-visible:border-green focus-visible:ring-[3px] focus-visible:ring-ring/50 
    focus-visible:outline-1 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 
    has-data-[icon=inline-end]:pr-1
    has-data-[icon=inline-start]:pl-1 group-data-[variant=default]/tabs-list:data-selected:shadow-sm
    group-data-[variant=line]/tabs-list:data-selected:shadow-none [&_svg]:pointer-events-none [&_svg]:shrink-0
    [&_svg:not([class*='size-'])]:size-4
    group-data-[variant=line]/tabs-list:bg-transparent group-data-[variant=line]/tabs-list:data-selected:bg-transparent
    data-selected:bg-neutral-50 data-selected:text-neutral-900 after:absolute after:bg-neutral-50
    after:opacity-0 after:transition-opacity
    group-data-horizontal/tabs:after:inset-x-0 group-data-horizontal/tabs:after:bottom-[-5px] 
    group-data-horizontal/tabs:after:h-0.5 group-data-vertical/tabs:after:inset-y-0 
    group-data-vertical/tabs:after:-right-1 group-data-vertical/tabs:after:w-0.5 
    group-data-[variant=line]/tabs-list:data-selected:after:opacity-100`
})

export {
  tabsTriggerVariants
}