import { currentUserAtom } from "@/shared/models/current-user.model";
import { action, atom } from "@reatom/core";
import { withReset } from "@reatom/framework";
import { withCookie } from "@reatom/persist-web-storage";
import { IconArrowRight, IconLock, IconX } from "@tabler/icons-react";
import { ReactNode } from "react";
import { reatomComponent } from "@reatom/npm-react";
import { Button } from "@repo/ui/button";
import { navigate } from "vike/client/router";
import { Typography } from "@repo/ui/typography";

export type Widget = {
  id: string,
  icon?: any,
  title: string,
  description?: string
  action: ReactNode,
}

const SHOW_AUTH_WIDGET_COOKIE_KEY = "show-a-widget"

export const isShowAuthWidgetAtom = atom(true, "isShowAuthWidget").pipe(
  withCookie({ maxAge: 43200, path: "/" })(SHOW_AUTH_WIDGET_COOKIE_KEY)
)

export const isAuthedAtom = atom<boolean>((ctx) => {
  const isShow = ctx.spy(isShowAuthWidgetAtom);
  if (!isShow) return true;

  return !!ctx.spy(currentUserAtom)
}, "isAuthedAtom")

export const allWidgetSources = [isAuthedAtom];
export const activeWidgetAtom = atom<Widget | null>(null, "activeWidget").pipe(withReset())

export const initWidgets = action((ctx) => {
  for (const widget of allWidgetSources) {
    const target = ctx.get(widget)

    if (!target) {
      activeWidgetAtom(ctx, {
        id: 'auth',
        icon: IconLock,
        title: 'Вы не авторизованы',
        description: 'Авторизируйтесь, чтобы получить доступ к полному функционалу сайта.',
        action: (
          <AuthWidgetActions />
        ),
      })
    }
  }
}, "initWidgets")

const AuthWidgetActions = reatomComponent(({ ctx }) => {
  return (
    <div className="flex items-center justify-center gap-2">
      <Button
        className="bg-neutral-50 px-2"
        onClick={() => {
          activeWidgetAtom.reset(ctx)
          navigate("/auth")
        }}
      >
        <IconArrowRight size={20} className="sm:hidden inline text-neutral-950" />
        <Typography className="hidden sm:inline text-neutral-950 font-semibold text-sm">
          Авторизоваться
        </Typography>
      </Button>
      <Button
        className="bg-neutral-700 px-2"
        onClick={() => {
          activeWidgetAtom.reset(ctx)
          isShowAuthWidgetAtom(ctx, false)
        }}>
        <IconX size={20} className="sm:hidden inline"/>
        <Typography className="hidden text-nowrap sm:inline font-semibold text-sm">
          Не показывать
        </Typography>
      </Button>
    </div>
  )
}, "AuthWidgetActions")
