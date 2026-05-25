import { tv } from "tailwind-variants"

const selectControlVariant = tv({
  base: `
     flex items-center relative w-full gap-2
  `
})
const selectTriggerVariant = tv({
  base: `
    flex items-center justify-between w-full gap-2 bg-neutral-800 rounded-xl h-10
    text-sm sm:text-base px-4 py-2 text-neutral-400
    select-none border-none outline-none focus-visible:shadow-lg focus-visible:shadow-black/20
  `
})
const selectIndicatorsVariant = tv({
  base: `
    flex pointer-events-none items-center gap-2 bg-neutral-800
    shrink-0 absolute top-1/2 right-4 -translate-y-1/2
  `
})
const selectClearTriggerVariant = tv({
  base: `
    border-none flex items-center justify-center pointer-events-auto duration-150
    ease text-neutral-400 hover:text-neutral-50
  `
})
const selectIndicatorVariant = tv({
  base: `
    flex items-center justify-center shrink-0 text-neutral-400
  `
})
const selectContentVariant = tv({
  base: `
    flex flex-col rounded-xl bg-neutral-900 z-62 min-w-full
    data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=open]:fade-in
    duration-300 ease-out overflow-y-auto outline-none
  `
})
const selectItemVariant = tv({
  base: `
    flex hover:bg-neutral-800 rounded-lg items-center justify-between w-full px-4 py-2 select-none
  `
})
const selectItemGroupVariant = tv({
  base: `flex flex-col w-full`
})
const selectItemIndicatorVariant = tv({
  base: `flex items-center justify-center shrink-0 text-green-500`
})
const selectItemTextVariant = tv({ base: `overflow-hidden whitespace-nowrap text-ellipsis` })
const selectContentBaseStyle = {
  minWidth: `var(--reference-width)`,
  maxHeight: `min(var(--available-height, 300px), 300px)`
}
export {
  selectControlVariant,
  selectContentBaseStyle,
  selectItemTextVariant,
  selectItemGroupVariant,
  selectItemVariant,
  selectContentVariant,
  selectIndicatorsVariant,
  selectTriggerVariant,
  selectItemIndicatorVariant,
  selectClearTriggerVariant,
  selectIndicatorVariant
}
