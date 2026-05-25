import { reatomComponent } from "@reatom/npm-react"
import { landAtom, landBannerAtom, landGalleryAtom, landOwnerAtom } from "../models/land.model"
import { Avatar } from "@/shared/ui/avatar"
import { Typography } from "@/shared/ui/typography"
import { createLink, Link } from "@/shared/components/config/link"
import { FormattedText } from "./land-title"
import { IconCircleFilled, IconCrown, IconLink } from "@tabler/icons-react"
import { Button } from "@/shared/ui/button"
import { navigate } from "vike/client/router"
import { changesIsExist, landMode, saveChanges } from "../models/edit-land.model"
import { LandBanner } from "./land-banner"
import { Carousel } from '@ark-ui/react/carousel'

const LandGallery = reatomComponent(({ ctx }) => {
  const landGallery = ctx.spy(landGalleryAtom)

  return (
    <Carousel.Root
      slideCount={landGallery.length}
      allowMouseDrag={true}
      defaultPage={2}
      autoplay={true}
      loop={true}
      slidesPerPage={1.4}
      id="land-gallery"
      className="
          flex w-full relative items-center rounded-xl sm:overflow-hidden mb-6
          [--slide-spacing:8px]! sm:[--slide-spacing:16px]! h-[160px] sm:h-[350px]
        "
    >
      <Carousel.Control>
        <Carousel.ItemGroup>
          {landGallery.map((image, idx) => (
            <Carousel.Item
              key={idx}
              index={idx}
              className="flex-[0_0_70%] sm:flex-[0_0_60%] h-[160px] sm:h-[350px] rounded-xl overflow-hidden min-w-0 w-full"
            >
              <img
                src={image}
                draggable={false}
                className="w-full h-full select-none object-cover"
                width={1920}
                height={1080}
                loading="lazy"
                alt=""
              />
            </Carousel.Item>
          ))}
        </Carousel.ItemGroup>
      </Carousel.Control>
      <Carousel.IndicatorGroup className="absolute -bottom-8 sm:bottom-2 left-0 w-full right-0 z-1 flex items-center justify-center">
        <div className="flex gap-2 px-2 rounded-xl py-1 w-fit bg-black/30 backdrop-blur-2xl">
          {landGallery.map((_, idx) => (
            <Carousel.Indicator
              key={idx}
              index={idx}
              className="h-4 sm:h-3 cursor-pointer data-current:bg-neutral-50 bg-neutral-500 rounded-full aspect-square"
            />
          ))}
        </div>
      </Carousel.IndicatorGroup>
    </Carousel.Root>
  )
}, "LandGallery")

const LandToggleMode = reatomComponent(({ ctx }) => {
  return (
    <div className="flex flex-col gap-2 w-full h-fit">
      <Button
        name="Toggle mode"
        className="bg-neutral-50 px-2"
        onClick={() => landMode(ctx, (state) => state === 0 ? 1 : 0)}
        disabled={ctx.spy(saveChanges.statusesAtom).isPending}
      >
        <Typography className='text-neutral-950 font-semibold text-nowrap truncate'>
          {ctx.spy(landMode) === 0 ? "Режим редактирования" : "Режим просмотра"}
        </Typography>
      </Button>
      {ctx.spy(changesIsExist) && (
        <Button
          name="Save"
          className="bg-green-700"
          onClick={() => saveChanges(ctx)}
          disabled={ctx.spy(saveChanges.statusesAtom).isPending}
        >
          <Typography className="font-semibold text-nowrap truncate">
            Сохранить изменения
          </Typography>
        </Button>
      )}
    </div>
  )
}, "LandToggleMode")

export const Land = reatomComponent(({ ctx }) => {
  const land = ctx.spy(landAtom)
  const landOwner = ctx.spy(landOwnerAtom)
  const landGallery = ctx.spy(landGalleryAtom)

  if (!land || !landOwner) return null;

  const { area, members, privated, stats, level, created_at } = land

  return (
    <div className="flex flex-col lg:flex-row items-start gap-6 w-full h-full relative">
      <div className="flex flex-col gap-6 w-full h-full">
        <div className="flex items-start gap-6 w-full h-full">
          <LandBanner />
          <div className="flex flex-col gap-2 w-full h-full">
            <Typography className="text-2xl xl:text-3xl font-semibold">
              {land.name}
            </Typography>
            {land.title && <FormattedText as="span" text={land.title} />}
            <div id="details" className="flex flex-col sm:flex-row mt-2 items-start sm:items-center gap-1 sm:gap-2 w-full">
              <Typography>
                {members.length} {members.length === 1 ? "участник" : "участников"}
              </Typography>
              <IconCircleFilled size={10} />
              <Typography onClick={() => navigate("#points", { overwriteLastHistoryEntry: false })}>
                1 метка
              </Typography>
              <IconCircleFilled size={10} />
              <Typography>
                Нет дискорд сервера
              </Typography>
            </div>
          </div>
        </div>
        {landGallery.length >= 1 && <LandGallery />}
        <div id="description" className="flex w-full">

        </div>
        <div id="points" className="flex flex-col gap-2">
          <div className="flex items-center gap-2 w-full">
            <Typography className="text-2xl xl:text-3xl font-semibold">
              Метки
            </Typography>
            <div className="flex items-center justify-center bg-neutral-800 h-8 w-10 rounded-xl p-1">
              <span className="font-semibold text-lg">1</span>
            </div>
          </div>
          <div className="grid grid-cols-2 w-full h-full gap-4">
            <div className="flex flex-col p-4 rounded-lg border border-neutral-800">
              <Typography>
                #1
              </Typography>
            </div>
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-6 w-full lg:w-1/4 sticky h-fit">
        {ctx.spy(landBannerAtom) && (
          <div id="links" className="flex flex-col gap-2">
            <Typography className="text-2xl xl:text-3xl font-semibold">
              Ссылки
            </Typography>
            <div className="flex flex-col gap-1">
              <a target="_blank" href={ctx.spy(landBannerAtom)} className="flex items-center gap-2 text-blue-500">
                <Typography className="text-xl">
                  Баннер
                </Typography>
                <IconLink size={24} />
              </a>
            </div>
          </div>
        )}
        <div id="members" className="flex flex-col gap-2">
          <div className="flex items-end gap-2 w-full">
            <Typography className="text-2xl xl:text-3xl font-semibold">
              Участники
            </Typography>
            <div className="flex items-center justify-center aspect-square bg-neutral-800 h-8 rounded-lg">
              <span className="font-semibold text-base">{members.length}</span>
            </div>
          </div>
          <div className="flex flex-col gap-1 w-full">
            {members.map((member, idx) => (
              <Link
                href={createLink("player", member.nickname)}
                key={member.nickname}
                className="flex border hover:bg-neutral-800 justify-between border-neutral-800 py-2 px-4 rounded-lg items-center gap-2 w-full"
              >
                <div className="flex items-center gap-2">
                  <Avatar
                    nickname={member.nickname}
                    className="h-8 w-8"
                    url={member.avatar}
                  />
                  <Typography className="text-lg">
                    {member.nickname}
                  </Typography>
                </div>
                {idx === 0 && (
                  <IconCrown size={24} className='text-gold' />
                )}
              </Link>
            ))}
          </div>
        </div>
        {/* {ctx.spy(landIsOwnerAtom) && <LandToggleMode />} */}
      </div>
    </div>
  )
}, "Land")