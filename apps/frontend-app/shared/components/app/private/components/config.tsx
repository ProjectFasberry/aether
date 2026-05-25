import { Typography } from "@/shared/ui/typography"
import { CreateNews, EditNews, NewsWrapper, ViewNews } from "./news"
import { actionsParentAtom, actionsTypeAtom, type ActionParent, type ActionType } from "../models/actions.model"
import type { ReactNode } from "react"
import { BannersWrapper, CreateBanner, EditBanner, ViewBanner } from "./banners"
import { CreateDictionaries, DictionariesWrapper, ViewDictionaries } from "./dictionaries"
import { CreateEvent, EventsWrapper, ViewEvent } from "./events"
import { reatomComponent } from "@reatom/npm-react"
import { ActionsHeader } from "./ui"
import { Roles } from "./roles"
import { Methods } from "./methods"
import { Options } from "./options"

const list: Record<string, Partial<Record<ActionType, ReactNode>>> = {
  "news": {
    "create": <CreateNews />,
    "edit": <EditNews />,
    "view": <ViewNews />
  },
  "event": {
    "create": <CreateEvent />,
    "edit": null,
    "view": <ViewEvent />,
  },
  "banner": {
    "create": <CreateBanner />,
    "edit": <EditBanner />,
    "view": <ViewBanner />,
  },
  "dictionaries": {
    "create": <CreateDictionaries />,
    "edit": null,
    "view": <ViewDictionaries />,
  }
}

const ActionsHeaderSlot = reatomComponent<{ parent: ActionParent }>(({ ctx, parent }) => {
  const targetParent = ctx.spy(actionsParentAtom)
  const defaultComponent = list[parent]?.view ?? null
  if (!targetParent) return defaultComponent

  if (parent !== targetParent) return null;

  const targetType = ctx.spy(actionsTypeAtom);

  return list[parent][targetType]
}, "ActionsHeaderSlot")

export const Config = () => {
  return (
    <div className="flex flex-col gap-12 w-full h-full">
      <div className="flex flex-col sm:flex-row gap-6 sm:items-stretch h-full w-full">
        <div className="flex flex-col gap-4 w-full">
          <Typography className="text-xl font-bold">
            Глобальные параметры
          </Typography>
          <Options />
        </div>
        <div className="flex flex-col gap-4 w-full">
          <Typography className="text-xl font-bold">
            Платежные методы
          </Typography>
          <Methods />
        </div>
      </div>
      <div className="flex flex-col gap-4 w-full h-full">
        <Typography className="text-xl font-bold">
          Роли
        </Typography>
        <Roles />
      </div>
      <div className="flex flex-col gap-4 w-full h-fulll">
        <ActionsHeader title="Ивенты">
          <ActionsHeaderSlot parent="event" />
        </ActionsHeader>
        <EventsWrapper />
      </div>
      <div className="flex flex-col gap-4 w-full h-full">
        <ActionsHeader title="Баннеры">
          <ActionsHeaderSlot parent="banner" />
        </ActionsHeader>
        <BannersWrapper />
      </div>
      <div className="flex flex-col gap-4 w-full h-full">
        <ActionsHeader title="Новости" >
          <ActionsHeaderSlot parent="news" />
        </ActionsHeader>
        <NewsWrapper />
      </div>
      <div className="flex flex-col gap-4 w-full h-full">
        <ActionsHeader title="Справочник">
          <ActionsHeaderSlot parent="dictionaries" />
        </ActionsHeader>
        <DictionariesWrapper />
      </div>
    </div>
  )
}
