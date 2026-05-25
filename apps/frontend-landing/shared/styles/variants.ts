import { tv } from "tailwind-variants";

export const sectionVariantChild = tv({
  base: ``,
  slots: {
    title: "mb-4 text-2xl sm:text-3xl md:text-4xl xl:text-5xl",
    subtitle: "text-base sm:text-xl md:text-2xl xl:text-3xl",
    description: "text-base sm:text-lg lg:text-xl",
    action: "mx-auto w-full sm:mx-0 sm:w-1/2"
  }
})

export const sectionVariant = tv({
  base: `full-screen-section relative h-[80vh] lg:h-dvh flex-col items-center justify-center`,
  variants: {
    variant: {
      default: "flex",
      hidden: "hidden lg:flex",
    }
  },
  defaultVariants: {
    variant: "default"
  }
})

export const withWeather = tv({
  base: `weather [html[data-weather='rain']_&]:rain`
})