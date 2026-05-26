import { createSignal, Index } from "solid-js"
import { Carousel } from '@ark-ui/solid/carousel'
import { SPAWN_IMAGES } from "../(models)/spawn-carousel.model"
import {
  carouselIndicatorGroupVariant,
  carouselIndicatorVariant,
  carouselItemGroupVariant,
  carouselItemVariant,
  carouselRootVariant,
} from "@/shared/ui/carousel"

export const SpawnCarousel = () => {
  const [selected, setSelected] = createSignal(0)

  return (
    <Carousel.Root
      slideCount={SPAWN_IMAGES.length}
      class={carouselRootVariant()}
      page={selected()}
      allowMouseDrag={true}
      onPageChange={(details) => setSelected(details.page)}
      loop
      autoplay
      slidesPerPage={1.4}
      spacing={"16px"}
    >
      <Carousel.ItemGroup class={carouselItemGroupVariant()}>
        <Index each={SPAWN_IMAGES}>
          {(image, idx) => (
            <Carousel.Item index={idx} class={carouselItemVariant()}>
              <img
                src={image()}
                draggable={false}
                class="max-h-[1080px] brightness-75"
                loading="lazy"
                alt=""
              />
            </Carousel.Item>
          )}
        </Index>
      </Carousel.ItemGroup>
      <div class="absolute bottom-4 flex items-center justify-center right-0 left-0">
        <Carousel.IndicatorGroup class={carouselIndicatorGroupVariant()}>
          <Index each={SPAWN_IMAGES}>
            {(_, idx) => <Carousel.Indicator class={carouselIndicatorVariant()} index={idx} />}
          </Index>
        </Carousel.IndicatorGroup>
      </div>
    </Carousel.Root>
  )
}
