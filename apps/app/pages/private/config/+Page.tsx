import { Options } from "@/shared/components/app/private/components/options";
import { Typography } from "@repo/ui/typography";
import { Methods } from "@/shared/components/app/private/components/methods";
import { Roles } from "@/shared/components/app/private/components/roles";
import { DictionariesWrapper, CreateDictionaries, ViewDictionaries } from "@/shared/components/app/private/components/dictionaries";
import { reatomComponent, useAtom } from "@reatom/npm-react";
import { pageCtxAtom } from "@/shared/models/page-context.model";
import { ActionParent, actionsParentAtom, actionsSearchParamsAtom, actionsTypeAtom, ActionType } from "@/shared/components/app/private/models/actions.model";
import { ReactNode } from "react";
import { CreateNews, EditNews, NewsWrapper, ViewNews } from "@/shared/components/app/private/components/news";
import { CreateEvent, EventsWrapper, ViewEvent } from "@/shared/components/app/private/components/events";
import { BannersWrapper, CreateBanner, EditBanner, ViewBanner } from "@/shared/components/app/private/components/banners";
import { ActionsHeader } from "@/shared/components/app/private/components/ui";
import { createPageModel } from "@/shared/lib/events";

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

const page = createPageModel({
  name: "private.config",
  onSpyAction: (ctx, dataAtom, pageCtx) => {
    actionsSearchParamsAtom(ctx, (state) => pageCtx?.urlParsed.search ?? state)
  },
  spyedAtom: pageCtxAtom
})

export default function Page() {
  const [_] = useAtom(page.dataAtom)

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <div className="flex flex-col sm:flex-row sm:items-stretch gap-4 h-full w-full">
        <div className="flex flex-col gap-4 bg-neutral-900 rounded-xl p-4 w-full">
          <Typography className="text-xl font-bold">
            Глобальные параметры
          </Typography>
          <div className="flex flex-col gap-1 w-full h-full">
            <Options />
          </div>
        </div>
        <div className="flex flex-col gap-4 bg-neutral-900 rounded-xl p-4 w-full">
          <Typography className="text-xl font-bold">
            Платежные методы
          </Typography>
          <div className="flex flex-col gap-1 w-full h-full">
            <Methods />
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-4 bg-neutral-900 rounded-xl p-4 w-full h-full">
        <Typography className="text-xl font-bold">
          Роли
        </Typography>
        <div className="flex flex-col gap-1 w-full h-full">
          <Roles />
        </div>
      </div>
      <div className="flex flex-col gap-4 w-full h-full bg-neutral-900 rounded-xl p-4">
        <ActionsHeader title="Ивенты">
          <ActionsHeaderSlot parent="event" />
        </ActionsHeader>
        <EventsWrapper />
      </div>
      <div className="flex flex-col gap-4 w-full h-full bg-neutral-900 rounded-xl p-4">
        <ActionsHeader title="Баннеры">
          <ActionsHeaderSlot parent="banner" />
        </ActionsHeader>
        <BannersWrapper />
      </div>
      <div className="flex flex-col gap-4 w-full h-full bg-neutral-900 rounded-xl p-4">
        <ActionsHeader title="Новости" >
          <ActionsHeaderSlot parent="news" />
        </ActionsHeader>
        <NewsWrapper />
      </div>
      <div className="flex flex-col gap-4 w-full h-full bg-neutral-900 rounded-xl p-4">
        <ActionsHeader title="Справочник">
          <ActionsHeaderSlot parent="dictionaries" />
        </ActionsHeader>
        <DictionariesWrapper />
      </div>
    </div>
  )
}