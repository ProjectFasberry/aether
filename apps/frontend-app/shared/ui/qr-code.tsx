import { tv } from "tailwind-variants";

const qrCodeRootVariant = tv({
  base: `
    relative flex w-fit flex-col [--qr-code-size:100px] rounded-[12px]  [--qr-code-overlay-size:calc(var(--qr-code-size)/3)] bg-neutral-50
  `
})

const qrCodeFrameVariant = tv({
  base: `
    w-(--qr-code-size) h-(--qr-code-size) p-2 fill-neutral-950
  `
})

const qrCodePatternVariant = tv({
  base: `
    fill-inherit
  `
})

const qrCodeOverlayVariant = tv({
  base: `
    flex items-center justify-center rounded-lg w-[calc(var(--qr-code-overlay-size)/1.2)] h-[calc(var(--qr-code-overlay-size)/1.2)] p-2 bg-neutral-950
    select-none [&_img]:w-full [&_img]:h-full [&_img]:object-contain [&_svg]:w-full [&_svg]:h-full [&_svg]:object-contain
  `
})

export {
  qrCodeRootVariant,
  qrCodeFrameVariant,
  qrCodeOverlayVariant,
  qrCodePatternVariant
}
