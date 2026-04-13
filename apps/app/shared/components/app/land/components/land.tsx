import { reatomComponent } from "@reatom/npm-react"
import { landAtom, landBannerAtom, landGalleryAtom, landIsOwnerAtom, landOwnerAtom } from "../models/land.model"
import { Avatar } from "@/shared/components/app/avatar/components/avatar"
import { Typography } from "@repo/ui/typography"
import { createLink, Link } from "@/shared/components/config/link"
import useEmblaCarousel from 'embla-carousel-react'
import { FormattedText } from "./land-title"
import { IconCircleFilled, IconCrown, IconLink } from "@tabler/icons-react"
import { Button } from "@repo/ui/button"
import { navigate } from "vike/client/router"
import { changesIsExist, landMode, saveChanges } from "../models/edit-land.model"
import { LandBanner } from "./land-banner"

const LandGallery = reatomComponent(({ ctx }) => {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: "center" })
  const landGallery = ctx.spy(landGalleryAtom)

  return (
    <div
      id="gallery"
      ref={emblaRef}
      className="flex w-full items-center rounded-xl overflow-hidden h-[200px] sm:h-[350px]"
    >
      <div className="flex gap-4 w-full px-4 h-full py-0">
        {landGallery.map((image, idx) => (
          <div
            key={idx}
            className="flex-[0_0_70%] sm:flex-[0_0_60%] rounded-xl overflow-hidden min-w-0 w-full"
          >
            <img
              src={image}
              draggable={false}
              className="w-full h-[200px] sm:h-[350px] select-none object-cover"
              width={1920}
              height={1080}
              loading="lazy"
              alt=""
            />
          </div>
        ))}
      </div>
    </div>
  )
}, "LandGallery")

const LandToggleMode = reatomComponent(({ ctx }) => {
  return (
    <div className="flex flex-col gap-2 w-full h-fit">
      <Button
        name="Toggle mode"
        className="bg-neutral-50 px-2"
        onClick={() => landMode.toggle(ctx)}
        disabled={ctx.spy(saveChanges.statusesAtom).isPending}
      >
        <Typography className='text-neutral-950 font-semibold text-nowrap truncate'>
          {ctx.spy(landMode) === 'watch' ? "Режим редактирования" : "Режим просмотра"}
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

  const { area, members, balance, stats, level, created_at } = land

  return (
    <div className="flex flex-col lg:flex-row items-start gap-8 w-full h-full relative">
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
                <IconLink size={26} />
              </a>
            </div>
          </div>
        )}
        <div id="members" className="flex flex-col gap-2">
          <div className="flex items-center gap-2 w-full">
            <Typography className="text-2xl xl:text-3xl font-semibold">
              Участники
            </Typography>
            <div className="flex items-center justify-center bg-neutral-800 h-8 w-10 rounded-xl p-1">
              <span className="font-semibold text-lg">{members.length}</span>
            </div>
          </div>
          <div className="flex flex-col gap-1 w-full">
            {members.map((member, idx) => (
              <Link
                href={createLink("player", member.nickname)}
                key={member.nickname}
                className="flex items-center gap-2 w-full"
              >
                <Avatar nickname={member.nickname} className="min-h-[40px] min-w-[40px]" propHeight={40} propWidth={40} />
                {idx === 0 && (
                  <IconCrown size={28} className='text-gold' />
                )}
                <Typography className="text-lg">
                  {member.nickname}
                </Typography>
              </Link>
            ))}
          </div>
        </div>
        {ctx.spy(landIsOwnerAtom) && <LandToggleMode />}
      </div>
    </div>
  )
}, "Land")