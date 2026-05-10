import { Action, action, atom } from "@reatom/framework"
import { withAssign } from "@reatom/framework"
import { isDeepEqual, sleep, withInit, withReset } from "@reatom/framework"
import { ReactNode } from "react"
import { logout } from "../../auth/models/logout.model"
import { listenBackOnce } from "@/shared/lib/events"
import { withUndo } from '@reatom/undo'
import { appState } from "@/shared/models/app/base.model"
import { DIALOG_DELAY } from "@/shared/consts/index"

export type SettingsNavigationNode = {
  title: string,
  value: string,
  as?: "link" | "button",
  cb?: Action<[], void>
}
export type SettingsNavigation = {
  title?: string,
  nodes: Array<SettingsNavigationNode>
}

export type SettingsParent = "profile" | "main" | "app" | "account"
export type SettingsSectionItem = {
  title: string,
  description: string,
  component: ReactNode
}

export const SETTINGS_NAVIGATION: Partial<Record<SettingsParent, SettingsNavigation>> = {
  main: {
    title: "Основные настройки",
    nodes: [
      { title: "Аккаунт", value: "account" },
      { title: "Безопасность", value: "security" },
      { title: "Устройства", value: "devices" },
      { title: "Подключения", value: "connections" },
      { title: "Магазин", value: "store" }
    ]
  },
  app: {
    title: "Настройки приложения",
    nodes: [
      { title: "Персонализация", value: "appearance" },
    ]
  },
  account: {
    nodes: [
      { title: "Выйти", value: "logout", as: "button", cb: logout.withConfirm }
    ]
  }
}

type SettingsStateTarget = {
  parent: SettingsParent, 
  child: string | null
}

const getFallbackSection = () => {
  const [parent, child] = Object.entries(SETTINGS_NAVIGATION)[0]
  return { 
    parent: parent as SettingsParent, 
    child: child.nodes[0].value 
  }
}

export const settingsState = atom(null, "settingsState").pipe(
  withAssign((_, name) => ({
    dialogIsOpen: atom(false, `${name}.dialogIsOpen`),
    cleanup: atom<{ cb: () => void } | null>(null).pipe(withReset()),
    target: atom<SettingsStateTarget>(getFallbackSection(), `${name}.target`).pipe(
      withUndo({ length: 100 }),
      withReset(),
      withInit((ctx, target) => {
        const isMobile = ctx.get(appState.currentState.isMobile);

        if (isMobile) {
          return { parent: "main" as const, child: null }
        }

        return target(ctx)
      })
    )
  }))
)
settingsState.dialogIsOpen.onChange((ctx, state) => state ? settings.open(ctx) : settings.close(ctx))

export const settings = atom(null, "settings").pipe(
  withAssign(() => ({
    navigate: action((ctx, parent: SettingsParent, child: string) => {
      settingsState.target(ctx, { parent, child });

      if (!ctx.get(settingsState.cleanup)) {
        const cb = listenBackOnce(() => settings.back(ctx));
        settingsState.cleanup(ctx, { cb });
      } else {
        window.history.pushState({ active: true }, '');
      }
    }),
    open: action((ctx) => {
      settingsState.dialogIsOpen(ctx, true)
    }),
    close: action(async (ctx) => {
      settingsState.dialogIsOpen(ctx, false)

      await sleep(DIALOG_DELAY);

      const currValue = ctx.get(settingsState.dialogIsOpen)

      if (!currValue) {
        settingsState.target.reset(ctx);
        settingsState.cleanup.reset(ctx);
      }
    }),
    back: action((ctx) => {
      settingsState.target.undo(ctx)

      const history = ctx.get(settingsState.target.isUndoAtom);

      if (!history) {
        const cleanup = ctx.get(settingsState.cleanup)?.cb;
        cleanup?.();
        settingsState.dialogIsOpen(ctx, false)
        settingsState.cleanup.reset(ctx);
      } else {
        const cb = listenBackOnce(() => settings.back(ctx));
        settingsState.cleanup(ctx, { cb });
      }
    })
  }))
)

export const settingsNavigationItemIsActiveAtom = (parent: SettingsParent, child: string) => atom((ctx) =>
  isDeepEqual(
    ctx.spy(settingsState.target), { parent, child }
  )
)