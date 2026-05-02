import { IconBrandDiscordFilled, IconBrandTelegram } from "@tabler/icons-react"
import { Link } from "../../../config/link"
import { Typography } from "@repo/ui/typography"
import { CONTACTS } from "../../../../consts/contacts"
import { env } from "@/shared/env"
import { Logotype } from "./logotype"

const telegramHref = CONTACTS.find(t => t.value === 'tg')?.href as string
const discordHref = CONTACTS.find(t => t.value === 'ds')?.href as string

const createLandingUrl = (path: string) => `${env.VITE_LANDING_URL}${path}`

export const Footer = () => {
  return (
    <div
      className="
        flex items-center justify-center w-full pb-24 h-full lg:min-h-40 p-3 lg:p-4 
        bg-gradient-to-br from-green-800/40 via-green-800/50 to-green-800/40 border-t border-green-700/20 
        lg:backdrop-blur-md
      "
    >
      <div className="flex flex-col items-center justify-center responsive h-full gap-4">
        <div className="flex flex-col lg:flex-row justify-between gap-4 lg:items-start w-full h-full">
          <div className="flex flex-col gap-4 items-start h-full w-full lg:w-1/3">
            <div className="h-14 w-full">
              <Logotype />
            </div>
            <div
              className="
                flex items-center gap-2 
                *:bg-neutral-600/40 *:hover:bg-neutral-600/60 *:duration-150
                *:flex *:items-center *:justify-center *:p-2 *:rounded-full
              "
            >
              <Link href={discordHref} aria-label="Дискорд">
                <IconBrandDiscordFilled size={18} />
              </Link>
              <Link href={telegramHref} aria-label="Телеграм">
                <IconBrandTelegram size={18} />
              </Link>
            </div>
          </div>
          <div className="grid auto-rows-auto grid-cols-1 lg:grid-rows-none lg:grid-cols-3 gap-4 w-full lg:w-2/3">
            <div className="flex flex-col min-w-0 gap-1 *:w-fit">
              <Typography className="font-semibold truncate">
                О проекте
              </Typography>
              <div className="flex flex-col gap-1 min-w-0 *:truncate">
                <Link href="/news">
                  Новости
                </Link>
              </div>
            </div>
            <div className="flex flex-col min-w-0 gap-1 *:w-fit">
              <Typography className="font-semibold truncate">
                Информация
              </Typography>
              <div className="flex flex-col gap-1 min-w-0 *:truncate">
                <Link href={createLandingUrl("/info/contacts")}>
                  Контакты
                </Link>
                <Link href={createLandingUrl("/info/privacy")}>
                  Конфиденциальность
                </Link>
              </div>
            </div>
            <div className="flex flex-col min-w-0 gap-1 *:w-fit">
              <Typography className="font-semibold truncate">
                Ресурсы
              </Typography>
              <div className="flex flex-col gap-1 min-w-0 *:truncate">
                <Link href={createLandingUrl("/status")}>
                  Статус
                </Link>
                <Link href={createLandingUrl("/wiki")}>
                  FAQ
                </Link>
              </div>
            </div>
          </div>
        </div>
        <Typography className="text-neutral-400 text-sm truncate text-wrap">
          НЕ ЯВЛЯЕТСЯ ОФИЦИАЛЬНЫМ СЕРВИСОМ MINECRAFT. НЕ ОДОБРЕНО И НЕ СВЯЗАНО С MOJANG ИЛИ MICROSOFT.
        </Typography>
      </div>
    </div>
  )
}