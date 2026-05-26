import { tv } from "tailwind-variants";

const carouselRootVariant = tv({
  base: `
    flex flex-col gap-4 relative w-full duration-150 ease-in
    data-[orientation=vertical]:flex-row data-[orientation=vertical]:max-w-max data-[orientation=vertical]:h-[320px]
  `,
})
const carouselViewportVariant = tv({
  base: `
    overflow-hidden rounded-[8px]
  `
})
const carouselItemGroupVariant = tv({
  base: `
    flex flex-1 min-w-fit overflow-hidden rounded-[8px] scrollbar scrollbar-w-0 scrollbar-none
  `
})
const carouselItemVariant = tv({
  base: `
    flex flex-[0_0_100%] min-w-0 [&_img]:w-full [&_img]:h-full [&_img]:object-cover [&_img]:rounded-[8px] [&_img]:bg-neutral-800
  `
})
const carouselSlideVariant = tv({
  base: `
    flex items-center justify-center w-full h-[192px] font-medium text-[18px] text-neutral-50
  `
})
const carouselControlVariant = tv({
  base: `
    flex items-center justify-between gap-[2px] data-[orientation=vertical]:flex-col data-[justify=center]:justify-center
  `
})
const carouselTriggerVariant = tv({
  base: `
   inline-flex items-center justify-center gap-1.5 w-[2.25rem] h-[2.25rem] font-medium rounded-[0.375rem] select-none whitespace-nowrap
   border border-neutral-800 text-neutral-50
  `
})
const carouselIndicatorGroupVariant = tv({
  base: `
    flex justify-center gap-2 data-[orientation=vertical]:flex-col  bg-neutral-50/10 px-4 py-2 rounded-full w-fit backdrop-blur-xl
  `
})
const carouselIndicatorVariant = tv({
  base: `
    cursor-pointer w-[0.625rem] h-[0.625rem] bg-neutral-400/80 backdrop-blur-md rounded-full border-none p-0
    focus-visible:outline focus-visible:outline-neutral-50 focus-visible:outline-2
    data-[current]:bg-green
  `
})
export {
  carouselRootVariant,
  carouselViewportVariant,
  carouselItemGroupVariant,
  carouselItemVariant,
  carouselControlVariant,
  carouselSlideVariant,
  carouselTriggerVariant,
  carouselIndicatorGroupVariant,
  carouselIndicatorVariant
}
