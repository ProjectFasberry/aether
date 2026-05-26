import { Link } from "@/shared/components/config/link"
import { MainWrapperPage } from "@/shared/ui/main-wrapper";
import { Button } from "@/shared/ui/button";
import { Typography } from "@/shared/ui/typography";
import { sectionVariant, sectionVariantChild } from "@/shared/styles/variants";
import { useTranslate } from "@/shared/locales/helpers";
import { useAtom } from "@reatom/npm-solid-js";
import { For, lazy } from "solid-js";
import { SpawnCarousel } from "./(components)/spawn-carousel";
import { IdeaMainNavigation, IdeaPreviewCard, IdeasList } from "./(components)/gameplay";
import { getStaticObject } from "@/shared/lib/helpers";
import { ClientOnly } from "vike-solid/ClientOnly";
import { weatherAtom } from "@/shared/components/layouts/settings.model";

const LayoutSettings = lazy(() => import("@/shared/components/layouts/settings").then(m => ({ default: m.LayoutSettings })))

const introImage = getStaticObject("arts", "server-status-widget.webp")
const shareImage = getStaticObject("arts", "bzzvanet-.jpg")

const CONTACTS_LIST = [
  { name: "Discord", href: "https://discord.gg/vnqfVX4frH" },
  { name: "Telegram", href: "https://t.me/fasberry" },
];

const Weather = () => {
  const [data] = useAtom(weatherAtom)
  return <div class={`weather ${data()} absolute z-[1] w-full h-full top-0 right-0 left-0`} />
}

export default function Page() {
  const translate = useTranslate().translate

  return (
    <MainWrapperPage variant="with_section">
      <ClientOnly>
        <LayoutSettings />
      </ClientOnly>
      <div id="title" class={sectionVariant()}>
        <div class="absolute top-0 right-0 left-0 overflow-hidden h-full">
          <div
            class="w-full h-full absolute top-0 right-0 brightness-[55%] left-0 bg-no-repeat bg-center bg-cover"
            style={{ "background-image": `url('${introImage}')` }}
          />
          <Weather />
        </div>
        <div class="flex items-center justify-start responsive z-1 mx-auto h-full">
          <div
            class="flex flex-col z-[2] w-full px-2 sm:px-0 lg:w-[50%] gap-2 sm:gap-4 justify-start items-start rounded-xl py-4 lg:py-6"
          >
            <div class="flex flex-col items-start justify-center w-full">
              <h1 class={sectionVariantChild().title({ className: "text-pink-300" })}>
                Fasberry Project
              </h1>
              <h2 class={sectionVariantChild().subtitle({ className: "text-white mb-4" })}>
                {translate("welcome.subtitle")}
              </h2>
              <h3 class={sectionVariantChild().description({ className: "text-white text-shadow-lg" })}>
                {translate("welcome.description")}
              </h3>
            </div>
            <Link href="/start" class={sectionVariantChild().action()}>
              <Button variant="minecraft" class="w-full py-1 sm:py-1.5" >
                <Typography color="white" class="text-nowrap text-base sm:text-xl text-shadow-xl">
                  {translate("welcome.actionText")}
                </Typography>
              </Button>
            </Link>
          </div>
        </div>
      </div>
      <div id="features" class={sectionVariant()}>
        <div class="flex flex-col items-center mx-auto responsive gap-6 justify-center select-none relative">
          <Typography color="white" class="text-xl text-center sm:text-3xl lg:text-4xl">
            {translate("features.title")}
          </Typography>
          <div class="flex items-center justify-center w-full gap-1 sm:gap-6 md:gap-4">
            <IdeaMainNavigation type="prev" />
            <div
              class="flex rounded-md overflow-x-auto items-center justify-start w-fit
								scrollbar scrollbar-thumb-rounded-xl scrollbar-h-0 scrollbar-thumb-neutral-900
							"
            >
              <IdeasList />
            </div>
            <IdeaMainNavigation type="next" />
          </div>
          <IdeaPreviewCard />
        </div>
      </div>
      <div id="spawn" class={sectionVariant()}>
        <div class="flex flex-col items-center z-1 mx-auto responsive justify-center relative">
          <div class="flex flex-col gap-4 items-center justify-center h-full sm:overflow-hidden relative w-full">
            <div class="flex items-center justify-center h-full w-full">
              <SpawnCarousel />
            </div>
            <div
              class="flex flex-col bg-neutral-700/60 backdrop-blur-sm p-2 rounded-xl w-full gap-2 z-[21] lg:w-[60%] xl:w-[70%]"
            >
              <Typography color="white" class="text-base sm:text-xl leading-6 text-center">
                Спавн сервера
              </Typography>
              <Typography color="gray" class="!leading-5 text-sm sm:text-base text-center">
                Спавном сервера является город Оффенбург, в котором можно найти много интересных и даже секретных мест,
                персонажей, с которыми можно пообщаться и прочие активности.
              </Typography>
            </div>
          </div>
        </div>
      </div>
      <div id="share" class={sectionVariant()}>
        <div class="absolute top-0 right-0 left-0 overflow-hidden h-full">
          <div
            class="w-full h-full absolute top-0 right-0 brightness-[55%] left-0 bg-no-repeat bg-center bg-cover"
            style={{ "background-image": `url('${shareImage}')` }}
          />
        </div>
        <div class="flex flex-col items-center z-1 responsive gap-12 justify-center select-none relative">
          <Typography color="white" class="text-center text-xl sm:text-2xl md:text-4xl lg:text-5xl xl:text-6xl">
            {translate("contacts.title")}
          </Typography>
          <div class="flex flex-col gap-4 justify-center items-center lg:w-1/4 *:w-full w-full h-full">
            <For each={CONTACTS_LIST}>
              {(item) =>
                <a href={item.href} target="_blank" rel="noreferrer">
                  <Button variant="minecraft" class="w-full py-0.5">
                    <Typography class="text-white text-lg">
                      {translate("contacts.itemTitle")} {item.name}
                    </Typography>
                  </Button>
                </a>
              }
            </For>
          </div>
        </div>
      </div>
    </MainWrapperPage>
  )
}
