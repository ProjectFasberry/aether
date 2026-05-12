import type { CSSProperties } from "react"
import { tv } from "tailwind-variants"
import { DIALOG_DELAY } from "../consts"

const dialogBackdropVariant = tv({
  base: `
    fixed inset-0 bg-black/60 backdrop-blur-lg z-[calc(50+50)]
    data-[state=open]:animate-in data-[state=open]:fade-in
    data-[state=closed]:animate-out data-[state=closed]:fade-out
  `
})
const dialogPositionerVariant = tv({
  base: `
    fixed inset-0 flex items-center justify-center
    z-[calc(50+50)] overscroll-y-none scrollbar-gutter-stable
  `
})
const dialogContentVariant = tv({
  base: `
    relative flex flex-col items-center justify-center overflow-hidden gap-4
    w-full max-w-[min(var(--spacing-container-lg),calc(100vw-1rem))] p-4
    bg-neutral-900 border-none rounded-xl outline-none
    shadow-xl transition-transform z-[51+50)]
    -translate-x-[calc(var(--scrollbar-width,0px)/2)]
    data-[has-nested]:scale-[calc(1-var(--nested-layer-count)*0.05)]
    data-[state=open]:animate-in data-[state=open]:zoom-in-95 data-[state=open]:fade-in
    data-[state=closed]:animate-out data-[state=closed]:zoom-out-95 data-[state=closed]:fade-out
  `
})
const dialogTitleVariant = tv({
  base: "text-base sm:text-lg font-semibold leading-2 text-center tracking-tight"
})
const dialogCloseVariant = tv({
  base: `
    inline-flex items-center cursor-pointer justify-center absolute right-2 top-2 w-5 h-5 p-0 border-none rounded-sm
    bg-neutral-50
  `
})

const dialogBaseStyle: CSSProperties = {
  transitionDuration: `${DIALOG_DELAY}ms`
}

export {
  dialogBaseStyle,
  dialogContentVariant,
  dialogBackdropVariant,
  dialogPositionerVariant,
  dialogTitleVariant,
  dialogCloseVariant
}