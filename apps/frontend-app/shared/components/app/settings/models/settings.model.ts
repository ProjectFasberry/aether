import { type Action, action, atom, reatomAsync, spawn } from "@reatom/framework"
import { withAssign } from "@reatom/framework"
import { isDeepEqual, sleep, withInit, withReset } from "@reatom/framework"
import { type ReactNode } from "react"
import { logout } from "../../auth/models/logout.model"
import { listenBackOnce } from "@/shared/lib/events"
import { withUndo } from '@reatom/undo'
import { appState } from "@/shared/models/app/index.model"
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
export type SettingsSectionItem = { title: string, description: string, children: ReactNode }

export const SETTINGS_NAVIGATION: Partial<Record<SettingsParent, SettingsNavigation>> = {
  main: {
    title: "Основные настройки",
    nodes: [
      { title: "Аккаунт", value: "account" },
      // { title: "Безопасность", value: "security" },
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
    isOpen: atom(false, `${name}.isOpen`),
    cleanup: atom<{ cb: () => void } | null>(null).pipe(withReset()),
    target: atom<SettingsStateTarget>(getFallbackSection(), `${name}.target`).pipe(
      withUndo({ length: 100 }),
      withReset(),
      withInit((ctx, target) => {
        const isMobile = ctx.get(appState.current.isMobile);

        if (isMobile) {
          return { parent: "main" as const, child: null }
        }

        return target(ctx)
      })
    )
  }))
)
settingsState.isOpen.onChange((ctx, state) =>
  spawn(ctx, (spawnCtx) => state ? settings.open(spawnCtx) : settings.close(spawnCtx))
)

export const settings = atom(null, "settings").pipe(
  withAssign((_, name) => ({
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
      settingsState.isOpen(ctx, true)
    }, `${name}.open`),
    close: reatomAsync(async (ctx) => {
      settingsState.isOpen(ctx, false)

      await ctx.schedule(() => sleep(DIALOG_DELAY))

      const currValue = ctx.get(settingsState.isOpen)

      if (!currValue) {
        settingsState.target.reset(ctx);
        settingsState.cleanup.reset(ctx);
      }
    }, `${name}.close`),
    back: action((ctx) => {
      settingsState.target.undo(ctx)

      const history = ctx.get(settingsState.target.isUndoAtom);

      if (!history) {
        const cleanup = ctx.get(settingsState.cleanup)?.cb;
        cleanup?.();

        settingsState.isOpen(ctx, false)
        settingsState.cleanup.reset(ctx);
      } else {
        const cb = listenBackOnce(() => settings.back(ctx));
        settingsState.cleanup(ctx, { cb });
      }
    }, `${name}.back`)
  }))
)

export const settingsNavigationItemIsActiveAtom = (parent: SettingsParent, child: string) => atom((ctx) =>
  isDeepEqual(
    ctx.spy(settingsState.target), { parent, child }
  )
)
