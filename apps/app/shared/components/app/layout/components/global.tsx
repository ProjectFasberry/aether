import { pageState } from "@/shared/models/page-context.model";
import { atom } from "@reatom/framework";
import { reatomComponent } from "@reatom/npm-react";
import { lazy } from "react";
import { ClientOnly } from "vike-react/ClientOnly";
import { Widgets } from "../../widgets/components/widgets";
import { AlertDialog } from "@/shared/components/config/alert-dialog";
import { Toaster } from "@/shared/components/config/toaster";
import { userState } from "@/shared/models/app/base.model";

const SettingsDialog = lazy(() => import("@/shared/components/app/settings/components/settings").then(d => ({ default: d.SettingsDialog })))

const isAuthedAtom = atom((ctx) => ctx.spy(pageState.isClientside) ? ctx.spy(userState.isAuthed) : false);

export const Global = reatomComponent(({ ctx }) => {
  const isAuthed = ctx.spy(isAuthedAtom)

  return (
    <>
      <ClientOnly>
        <Widgets />
      </ClientOnly>
      <AlertDialog />
      <ClientOnly>
        {isAuthed && <SettingsDialog />}
      </ClientOnly>
      <Toaster />
    </>
  )
}, "Global")
