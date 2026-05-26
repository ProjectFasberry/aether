import { MainWrapperPage } from "@/shared/ui/main-wrapper";
import { Typography } from "@/shared/ui/typography";
import { Link } from "@/shared/components/config/link";
import { Button } from "@/shared/ui/button";
import { getStaticObject } from "@/shared/lib/helpers";
import { Carousel } from "@ark-ui/solid/carousel";
import { atom } from "@reatom/framework";
import { getCommunityFolder } from "@/shared/const/folders";
import { sectionVariant, sectionVariantChild } from "@/shared/styles/variants";
import { Overlay } from "@/shared/ui/overlay";
import { WrapperTitle } from "@/shared/ui/wrapper-title";
import { useAtom } from "@reatom/npm-solid-js";
import { For, Index } from "solid-js";
import { Dialog } from "@ark-ui/solid/dialog";
import { Portal } from "solid-js/web";
import {
  dialogBackdropVariant,
  DialogClose,
  dialogContentVariant,
  dialogPositionerVariant
} from "@/shared/ui/dialog";
import {
  carouselIndicatorGroupVariant,
  carouselIndicatorVariant,
  carouselItemGroupVariant,
  carouselItemVariant,
  carouselRootVariant
} from "../../shared/ui/carousel";

const commuinityGallery = [
  getCommunityFolder("moon"),
  getCommunityFolder("sunset"),
  getCommunityFolder("market"),
  getCommunityFolder("duck"),
  getCommunityFolder("dragon_dead"),
  getCommunityFolder("hills"),
  getCommunityFolder("market_seller"),
  getCommunityFolder("offenburg"),
  getCommunityFolder("night"),
  getCommunityFolder("water_sand"),
  getCommunityFolder("early_sunset"),
];

const selectedKeyAtom = atom(0, "selectedKey")

const CarouselGallery = () => {
  const [selectedAtom, setSelectedAtom] = useAtom(selectedKeyAtom)

  return (
    <Carousel.Root
      slideCount={commuinityGallery.length}
      draggable={false}
      page={selectedAtom()}
      onPageChange={(details) => setSelectedAtom(details.page)}
      class={carouselRootVariant()}
      allowMouseDrag={true}
      loop
      spacing={"16px"}
    >
      <Carousel.ItemGroup class={carouselItemGroupVariant()}>
        <Index each={commuinityGallery}>
          {(image, idx) => (
            <Carousel.Item index={idx} class={carouselItemVariant()}>
              <img
                loading="lazy"
                src={image()}
                alt=""
                class="bg-transparent!"
                width={1920}
                height={1080}
              />
            </Carousel.Item>
          )}
        </Index>
      </Carousel.ItemGroup>
      <div class="absolute bottom-4 flex items-center justify-center right-0 left-0">
        <Carousel.IndicatorGroup class={carouselIndicatorGroupVariant()}>
          <Index each={commuinityGallery}>
            {(_, idx) => <Carousel.Indicator index={idx} class={carouselIndicatorVariant()} />}
          </Index>
        </Carousel.IndicatorGroup>
      </div>
    </Carousel.Root>
  )
}

const GalleryItemDialog = (props: { image: string }) => {
  return (
    <Dialog.Root>
      <Dialog.Trigger class='flex flex-col rounded-xl overflow-hidden hover:brightness-50'>
        <img
          src={props.image} loading="lazy" width={1280} alt="" height={720} class="w-auto object-cover"
        />
      </Dialog.Trigger>
      <Portal>
        <Dialog.Backdrop class={dialogBackdropVariant()} />
        <Dialog.Positioner class={dialogPositionerVariant()}>
          <Dialog.Content
            class={dialogContentVariant({
              className: `p-0! max-h-[720px] max-w-[1280px] bg-transparent!`
            })}
          >
            <CarouselGallery />
            <DialogClose />
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}

const CommunityGallery = () => {
  const [_, update] = useAtom(selectedKeyAtom)

  return (
    <For each={commuinityGallery}>
      {(image, idx) => (
        <div onClick={() => update(idx())}>
          <GalleryItemDialog image={image} />
        </div>
      )}
    </For>
  )
}

const url = getStaticObject("arts", "adventure-in-blossom.jpg")

export default function GalleryPage() {
  return (
    <MainWrapperPage variant="with_section">
      <div
        class={sectionVariant({ className: "bg-bottom md:bg-center bg-cover" })}
        style={{ "background-image": `url(${url})` }}
      >
        <Overlay variant="default" />
        <WrapperTitle>
          <div class="flex flex-col gap-6 w-full lg:max-w-3xl items-start justify-center">
            <div class="flex flex-col gap-2 lg:max-w-3xl">
              <h1 class={sectionVariantChild().title({ className: "text-gold" })}>
                Галерея
              </h1>
              <Typography color="white" class={sectionVariantChild().subtitle()}>
                Здесь игровые фотокарточки
              </Typography>
            </div>
            <Link href="#commuinity" class={sectionVariantChild().action()}>
              <Button variant="minecraft" class="w-full px-6 py-0.5 gap-2">
                <Typography color="white" class="text-lg">
                  К месту событий
                </Typography>
              </Button>
            </Link>
          </div>
        </WrapperTitle>
      </div>
      <div class="full-screen-section py-32">
        <div id="commuinity" class="flex flex-col gap-6 w-full responsive p-2">
          <div class="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-2 2xl:grid-cols-3 auto-rows-auto gap-2">
            <CommunityGallery />
          </div>
        </div>
      </div>
    </MainWrapperPage>
  )
}
