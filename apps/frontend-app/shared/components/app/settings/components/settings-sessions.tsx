import { Button } from "@/shared/ui/button";
import { reatomComponent, useUpdate } from "@reatom/npm-react";
import { sessions, sessionsState, type SessionPayload } from "../models/settings-security.model";
import { Menu } from "@ark-ui/react/menu";
import { Portal } from "@ark-ui/react/portal";
import { menuContentVariant } from "@/shared/ui/menu";
import { Skeleton } from "@/shared/ui/skeleton";
import { Noop } from "@/shared/ui/noop";
import { isEmptyArray } from "@/shared/lib/helpers";
import { Typography } from "@/shared/ui/typography";
import { IconDeviceDesktop, IconDeviceMobile, IconQuestionMark, type TablerIcon } from "@tabler/icons-react";

const PLATFORM_ICONS: Record<string, TablerIcon> = {
  "desktop": IconDeviceDesktop,
  "mobile": IconDeviceMobile,
  "unknown": IconQuestionMark
}

const SessionItemTrigger = ({ browser, os, platform, ip }: SessionPayload) => {
  const PlatformIcon = PLATFORM_ICONS[platform?.type ?? "unknown"] ?? PLATFORM_ICONS["unknown"];

  return (
    <div className="flex items-center overflow-hidden hover:bg-neutral-800 duration-300 rounded-lg px-2 py-1 max-h-14 h-14 gap-2 w-full">
      <div className="flex bg-neutral-700 rounded-full items-center justify-center aspect-square h-full">
        <PlatformIcon size={24} />
      </div>
      <div className="flex flex-col justify-center h-full">
        <Typography className="font-medium leading-5">
          {browser.name}
          <span className="text-[12px] font-normal text-neutral-400">&nbsp;{browser.version}</span>
        </Typography>
        <Typography className="text-neutral-400 font-medium text-sm leading-4">
          {os.name}&nbsp;{os.versionName} {ip}
        </Typography>
      </div>
    </div>
  )
}

const SessionItem = reatomComponent<{ session: SessionPayload, type: "current" | "active" }>(({ ctx, type, session }) => {
  const isLoading = ctx.spy(sessions.terminateAll.statusesAtom).isPending
    || ctx.spy(sessions.terminateById.statusesAtom).isPending

  return (
    <div
      className="flex flex-col gap-4 w-full inert:opacity-60 inert:pointer-events-none"
      inert={isLoading}
    >
      {type === 'current' ? (
        <>
          <SessionItemTrigger {...session} />
          <Button
            variant="danger"
            className="self-start text-sm font-semibold w-fit"
            onClick={() => sessions.beforeTerminateAll(ctx)}
          >
            Выйти из остальных сессий
          </Button>
        </>
      ) : (
        <Menu.Root
          onSelect={(details) => {
            if (details.value === 'terminate') sessions.terminateById(ctx, "2")
          }}
        >
          <Menu.ContextTrigger>
            <SessionItemTrigger {...session} />
          </Menu.ContextTrigger>
          <Portal>
            <Menu.Positioner>
              <Menu.Content className={menuContentVariant()}>
                <Menu.Item asChild value="terminate">
                  <Button variant="danger" className="self-start text-sm font-semibold w-fit" >
                    Выйти из сессии
                  </Button>
                </Menu.Item>
              </Menu.Content>
            </Menu.Positioner>
          </Portal>
        </Menu.Root>
      )}
    </div>
  )
}, "SessionItem")

const SessionsListActive = reatomComponent(({ ctx }) => {
  if (ctx.spy(sessions.fetchActive.statusesAtom).isPending) {
    return Array.from({ length: 2 }).map((_, idx) => <Skeleton key={idx} className="h-12 w-full" />)
  }

  const data = ctx.spy(sessionsState.activeList);
  if (!data || isEmptyArray(data)) return <Noop title="пусто" />

  return data.map((session, idx) => <SessionItem key={idx} session={session} type="active" />)
}, "SessionsListActive")

const SessionsListCurrent = reatomComponent(({ ctx }) => {
  if (ctx.spy(sessions.fetchCurrent.statusesAtom).isPending) {
    return <Skeleton className="h-12 w-full" />
  }

  const current = ctx.spy(sessionsState.current)
  if (!current) return <Noop title="пусто" />

  return <SessionItem session={current} type="current" />
}, "SessionsListCurrent")

export const SessionsList = () => {
  useUpdate(sessions.init, []);

  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="flex flex-col gap-2 w-full">
        <p className="text-sm font-medium leading-4">Текущая сессия</p>
        <SessionsListCurrent />
      </div>
      <div className="flex flex-col gap-2 w-full">
        <p className="text-sm font-medium leading-4">Активные сессии</p>
        <SessionsListActive />
      </div>
    </div>
  )
}
