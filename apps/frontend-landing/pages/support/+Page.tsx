import { Link } from "@/shared/components/config/link";
import { Button } from "@/shared/ui/button";
import { MainWrapperPage } from "@/shared/ui/main-wrapper";
import { Overlay } from "@/shared/ui/overlay";
import { Typography } from "@/shared/ui/typography";
import { WrapperTitle } from "@/shared/ui/wrapper-title";
import { LANDING_ENDPOINT } from '@/shared/env';
import { sectionVariant, sectionVariantChild } from "@/shared/styles/variants";
import { JSXElement } from "solid-js";
import { getStaticObject } from "@/shared/lib/helpers";

const bgImage = getStaticObject("backgrounds", "support_background.png");

const alexImage = getStaticObject("support", "alex.webp")
const steveImage = getStaticObject("support", "steve.webp");

const Card = (props: { children: JSXElement }) => {
  return (
    <div
      class="card-wrapper flex flex-col xl:flex-row overflow-hidden md:items-center justify-center md:justify-start items-center w-full"
    >
      {props.children}
    </div>
  );
};

export default function Page() {
  return (
    <MainWrapperPage variant="with_section">
      <div
        class={sectionVariant()}
        style={{ "background-image": `url(${bgImage})` }}
      >
        <Overlay variant="default" />
        <WrapperTitle>
          <div class="flex flex-col gap-6 w-full lg:max-w-3xl items-start justify-start">
            <div class="flex flex-col gap-2 w-full lg:max-w-3xl">
              <h1 class={sectionVariantChild().title({ className: "text-gold" })}>
                Поддержка проекта
              </h1>
              <Typography class={sectionVariantChild().subtitle()}>
                Здесь можно узнать о способах поддержки развития проекта
              </Typography>
            </div>
            <Link href="#support-list" class={sectionVariantChild().action()}>
              <Button variant="minecraft" class="w-full px-6 py-0.5 gap-2">
                <Typography class="text-lg">
                  Как поддержать?
                </Typography>
              </Button>
            </Link>
          </div>
        </WrapperTitle>
      </div>
      <div
        id="support-list"
        class="full-screen-section flex flex-col justify-center items-center relative py-24 lg:py-36"
      >
        <div class="flex flex-col justify-center gap-y-6 w-[90%] mx-auto">
          <div class="flex flex-col justify-center items-center mb-6">
            <Typography class="text-2xl md:text-3xl lg:text-4xl xl:text-5xl 2xl:text-6xl">
              Поддержка проекта
            </Typography>
            <Typography class="text-xl text-center text-gold">
              ниже представлены пока что основные способы помочь проекту. Спасибо!
            </Typography>
          </div>
          <div class="flex flex-col sm:flex-row gap-4 w-full h-full">
            <Card>
              <img
                width={244}
                height={244}
                loading="lazy"
                alt="Monitoring"
                class="max-h-[244px] w-auto"
                src={steveImage}
              />
              <div class="flex flex-col items-center xl:items-start gap-1 md:gap-2 w-full">
                <h2 class="text-xl lg:text-2xl xl:text-3xl 2xl:text-4xl">
                  Мониторинг
                </h2>
                <div class="flex flex-col mt-2 w-full">
                  <a
                    target="_blank"
                    href="https://hotmc.ru/vote-259308"
                    rel="noreferrer"
                    class="flex justify-center w-full xl:w-fit items-center button px-4 py-1"
                  >
                    <Typography class="text-nowrap text-base lg:text-xl">
                      Проголосовать #1
                    </Typography>
                  </a>
                  <a
                    target="_blank"
                    href="https://mcrating.org/minecraft-server-2159"
                    rel="noreferrer"
                    class="flex justify-center w-full xl:w-fit items-center button px-4 py-1"
                  >
                    <Typography class="text-nowrap text-base lg:text-xl">
                      Проголосовать #2
                    </Typography>
                  </a>
                </div>
              </div>
            </Card>
            <Card>
              <img
                width={244}
                height={244}
                class="max-h-[244px] w-auto"
                src={alexImage}
                loading="lazy"
                alt="Share"
              />
              <div class="flex flex-col items-center xl:items-start gap-2 w-full">
                <h2 class='text-shadow-md text-xl lg:text-2xl xl:text-3xl 2xl:text-4xl'>
                  Поделиться
                </h2>
                <div
                  class="flex flex-col justify-center md:justify-start w-full gap-2 mt-2
                    *:flex *:justify-center *:w-full *:xl:w-fit *:items-center *:px-4 *:py-1
                  "
                >
                  <a
                    href={`https://telegram.me/share/url?url=https%3A%2F%2F${LANDING_ENDPOINT}&text=`}
                    rel="noreferrer"
                    target="_blank"
                    class="button"
                  >
                    <Typography color="white" class="text-nowrap text-base lg:text-xl">
                      Поделиться в телеграмме
                    </Typography>
                  </a>
                  <a
                    href={`https://vk.com/share.php?url=https%3A%2F%2F${LANDING_ENDPOINT}&title=`}
                    rel="noreferrer"
                    target="_blank"
                    class="button"
                  >
                    <Typography color="white" class="text-base lg:text-xl">
                      Поделиться в вк
                    </Typography>
                  </a>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </MainWrapperPage>
  )
}
