import { currentUserAtom } from "@/shared/models/current-user.model";
import { action, atom } from "@reatom/core";
import { withReset } from "@reatom/framework";
import { withCookie } from "@reatom/persist-web-storage";
import { IconLock } from "@tabler/icons-react";
import { ReactNode } from "react";
import { AuthWidgetActions } from "../components/widget-variants";

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
