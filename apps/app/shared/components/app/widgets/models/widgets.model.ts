import { currentUserState } from "@/shared/models/current-user/index.model";
import { action, type Atom, atom, type Ctx } from "@reatom/framework";
import { withAssign } from "@reatom/framework";
import { withCookie } from "@reatom/persist-web-storage";
import { IconLock, type TablerIcon } from "@tabler/icons-react";
import { type ReactNode } from "react";
import { navigate } from "vike/client/router";

type WidgetBase = {
  icon?: TablerIcon,
  title: string,
  description?: string,
  onAction: (ctx: Ctx) => void,
  onHide: (ctx: Ctx) => void
}

type WidgetItem = WidgetBase & {
  cd: Atom<boolean>,
}

export type Widget = WidgetBase & {
  id: string,
  action: ReactNode,
}

const WIDGET_IDS = {
  AUTH_REQUIRED: "auth.required"
} as const;
const WIDGETS_SOURCES: Map<string, WidgetItem> = new Map([
  [WIDGET_IDS.AUTH_REQUIRED, {
    cd: atom((ctx) => {
      const isHiddenByUser = ctx.spy(widgetsState.data)[WIDGET_IDS.AUTH_REQUIRED]
      if (isHiddenByUser === false) return true;

      const user = ctx.spy(currentUserState);
      return !!user;
    }),
    title: "Вы не авторизованы",
    icon: IconLock,
    description: 'Авторизируйтесь, чтобы получить доступ к полному функционалу сайта.',
    onAction: () => {
      navigate("/auth")
    },
    onHide: (ctx) => {
      widget.hide(ctx, "auth.required")
    }
  }]
]);

export const widgetsState = atom(null, "widgetsState").pipe(
  withAssign((_, name) => ({
    data: atom<Record<string, boolean>>({}, `${name}.data`).pipe(
      withCookie({
        maxAge: 2600000000,
        path: "/",
      })(`${name}.data`)
    ),
    current: atom((ctx) => {
      for (const [id, body] of WIDGETS_SOURCES) {
        const isSatisfied = ctx.spy(body.cd);

        if (!isSatisfied) {
          return { id, ...body };
        }
      }

      return null;
    }, `${name}.current`)
  }))
)
export const widget = atom(null, "widget").pipe(
  withAssign(() => ({
    hide: action((ctx, id: string) => widgetsState.data(ctx, (state) => ({ ...state, [id]: false })))
  }))
)