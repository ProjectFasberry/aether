import { tv } from "tailwind-variants"

const hoverCardTriggerVariant = tv({
  base: `inline-flex items-center cursor-pointer transition-colors focus-visible:outline-none`
})
const hoverCardContentVariant = tv({
  base: `
    relative flex flex-col p-2 shadow-md [--arrow-size:10px] [--arrow-background]:bg-neutral-900 shadow-black/20 outline-none 
    bg-neutral-900 rounded-xl z-[calc(50+var(--layer-index,0))] origin-(--transform-origin) border-none duration-300
    data-[state=open]:animate-in data-[state=open]:fade-in data-[state=open]:ease-out
    data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=closed]:ease-in
  `
})
const hoverCardArrowVariant = tv({
  base: `[--arrow-background:bg-neutral-900]`
})
const hoverCardArrowTipVariant = tv({
  base: `border-t-1 border-neutral-800 border-l-1`
})
export {
  hoverCardTriggerVariant,
  hoverCardContentVariant,
  hoverCardArrowVariant,
  hoverCardArrowTipVariant
}