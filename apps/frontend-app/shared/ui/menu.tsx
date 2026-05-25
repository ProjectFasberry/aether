import { tv } from "tailwind-variants"

const menuTriggerVariant = tv({
  base: `
    inline-flex items-center cursor-pointer justify-center gap-2 duration-300 border-none
    focus-visible:outline-none disabled:opacity-50
  `
})
const menuContentVariant = tv({
  base: `
    flex flex-col relative bg-neutral-900 rounded-xl shadow-md shadow-black/20 outline-none z-[calc(70+var(--layer-index,0))]
    p-2 data-[state=open]:animate-in data-[state=open]:fade-in data-[state=closed]:animate-out data-[state=closed]:fade-out
  `
})
const menuArrowVariant = tv({
  base: `-z-1 [--arrow-background:bg-neutral-800]`
})
const menuArrowTipVariant = tv({
  base: `
    border-t-1 border-neutral-800 border-l-1
  `
})
const dropdownMenuItemVariants = tv({
  base: `
    hover:bg-neutral-800 hover:text-neutral-100 data-[variant=destructive]:text-red
    data-[variant=destructive]:hover:bg-red/10
    data-[variant=destructive]:hover:text-red data-[variant=destructive]:*:[svg]:text-red!
    [&_svg:not([class*='text-'])]:text-muted-foreground relative flex cursor-default items-center gap-2
    rounded-lg px-2 py-1.5 duration-300 outline-hidden select-none data-[disabled]:pointer-events-none
    data-[disabled]:opacity-50 data-[inset]:pl-8 [&_svg]:pointer-events-none [&_svg]:shrink-0
    [&_svg:not([class*='size-'])]:size-4
  `
})
export {
  menuTriggerVariant,
  menuContentVariant,
  menuArrowVariant,
  menuArrowTipVariant,
  dropdownMenuItemVariants
}