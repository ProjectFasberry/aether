import { Link } from "@/shared/components/config/link";
import { getStaticObject } from "@/shared/lib/volume";
import { Button } from "@repo/ui/button";
import { MainWrapperPage } from "@repo/ui/main-wrapper";
import { Overlay } from "@repo/ui/overlay";
import { Typography } from "@repo/ui/typography";
import { WrapperTitle } from "@repo/ui/wrapper-title";
import { LANDING_ENDPOINT } from '@/shared/env';
import { PropsWithChildren } from "react";
import { sectionVariant, sectionVariantChild } from "@/shared/styles/variants";

const bgImage = getStaticObject("backgrounds", "support_background.png");

const alexImage = getStaticObject("support", "alex.webp")
const steveImage = getStaticObject("support", "steve.webp");

const Card = ({ children }: PropsWithChildren) => {
  return (
    <div
      className="card-wrapper flex flex-col xl:flex-row overflow-hidden md:items-center justify-center md:justify-start items-center w-full"
    >
      {children}
    </div>
  )
}

export default function Page() {
  return (
    <MainWrapperPage variant="with_section">
      <div
        className={sectionVariant()}
        style={{ backgroundImage: `url(${bgImage})` }}
      >
        <Overlay variant="default" />
        <WrapperTitle>
          <div className="flex flex-col gap-6 w-full lg:max-w-3xl items-start justify-start">
            <div className="flex flex-col gap-2 w-full lg:max-w-3xl">
              <h1 className={sectionVariantChild().title({ className: "text-gold" })}>
                Поддержка проекта
              </h1>
              <Typography className={sectionVariantChild().subtitle()}>
                Здесь можно узнать о способах поддержки развития проекта
              </Typography>
            </div>
            <Link href="#support-list" className={sectionVariantChild().action()}>
              <Button variant="minecraft" className="w-full px-6 py-0.5 gap-2">
                <Typography className="text-lg">
                  Как поддержать?
                </Typography>
              </Button>
            </Link>
          </div>
        </WrapperTitle>
      </div>
      <div
        id="support-list"
        className="full-screen-section flex flex-col justify-center items-center relative py-24 lg:py-36"
      >
        <div className="flex flex-col justify-center gap-y-6 w-[90%] mx-auto">
          <div className="flex flex-col justify-center items-center mb-6">
            <Typography className="text-2xl md:text-3xl lg:text-4xl xl:text-5xl 2xl:text-6xl">
              Поддержка проекта
            </Typography>
            <Typography className="text-xl text-center text-gold">
              ниже представлены пока что основные способы помочь проекту. Спасибо!
            </Typography>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 w-full h-full">
            <Card>
              <img
                width={244}
                height={244}
                loading="lazy"
                alt="Monitoring"
                className="max-h-[244px] w-auto"
                src={steveImage}
              />
              <div className="flex flex-col items-center xl:items-start gap-1 md:gap-2 w-full">
                <h2 className="text-xl lg:text-2xl xl:text-3xl 2xl:text-4xl">
                  Мониторинг
                </h2>
                <div className="flex flex-col mt-2 w-full">
                  <a
                    target="_blank"
                    href="https://hotmc.ru/vote-259308"
                    rel="noreferrer"
                    className="flex justify-center w-full xl:w-fit items-center button px-4 py-1"
                  >
                    <Typography className="text-nowrap text-base lg:text-xl">
                      Проголосовать #1
                    </Typography>
                  </a>
                  <a
                    target="_blank"
                    href="https://mcrating.org/minecraft-server-2159"
                    rel="noreferrer"
                    className="flex justify-center w-full xl:w-fit items-center button px-4 py-1"
                  >
                    <Typography className="text-nowrap text-base lg:text-xl">
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
                className="max-h-[244px] w-auto"
                src={alexImage}
                loading="lazy"
                alt="Share"
              />
              <div className="flex flex-col items-center xl:items-start gap-2 w-full">
                <h2 className='text-shadow-md text-xl lg:text-2xl xl:text-3xl 2xl:text-4xl'>
                  Поделиться
                </h2>
                <div
                  className="flex flex-col justify-center md:justify-start w-full gap-2 mt-2
                    *:flex *:justify-center *:w-full *:xl:w-fit *:items-center *:px-4 *:py-1
                  "
                >
                  <a
                    href={`https://telegram.me/share/url?url=https%3A%2F%2F${LANDING_ENDPOINT}&text=`}
                    rel="noreferrer"
                    target="_blank"
                    className="button"
                  >
                    <Typography color="white" className="text-nowrap text-base lg:text-xl">
                      Поделиться в телеграмме
                    </Typography>
                  </a>
                  <a
                    href={`https://vk.com/share.php?url=https%3A%2F%2F${LANDING_ENDPOINT}&title=`}
                    rel="noreferrer"
                    target="_blank"
                    className="button"
                  >
                    <Typography color="white" className="text-base lg:text-xl">
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
