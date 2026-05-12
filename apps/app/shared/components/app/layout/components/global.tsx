import { reatomComponent } from "@reatom/npm-react";
import { lazy } from "react";
import { ClientOnly } from "vike-react/ClientOnly";
import { Widgets } from "../../widgets/components/widgets";
import { AlertDialog } from "@/shared/components/config/alert-dialog";
import { Toaster } from "@/shared/components/config/toaster";
import { userState } from "@/shared/models/app/index.model";

const Settings = lazy(() => import("@/shared/components/app/settings/components/settings").then(d => ({ default: d.Settings })))

export const Global = reatomComponent(({ ctx }) => {
  const isAuthed = ctx.spy(userState.isAuthed)
  
  return (
    <>
      <ClientOnly>
        <Widgets />
      </ClientOnly>
      <AlertDialog />
      <ClientOnly>
        {isAuthed && <Settings />}
      </ClientOnly>
      <Toaster />
    </>
  )
}, "Global")