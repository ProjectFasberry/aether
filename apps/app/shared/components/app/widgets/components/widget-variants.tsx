import { reatomComponent } from "@reatom/npm-react"
import { Button } from "@repo/ui/button"
import { activeWidgetAtom, isShowAuthWidgetAtom } from "../models/widgets.model"
import { navigate } from "vike/client/router"
import { IconArrowRight, IconX } from "@tabler/icons-react"
import { Typography } from "@repo/ui/typography"

export const AuthWidgetActions = reatomComponent(({ ctx }) => {
  return (
    <div className="flex items-center justify-center gap-2">
      <Button
        className="bg-neutral-50 px-2"
        background="white"
        onClick={() => {
          activeWidgetAtom.reset(ctx)
          navigate("/auth")
        }}
      >
        <IconArrowRight size={20} className="sm:hidden inline" />
        <Typography className="hidden sm:inline font-semibold text-sm">
          Авторизоваться
        </Typography>
      </Button>
      <Button
        background="default"
        className="px-2"
        onClick={() => {
          activeWidgetAtom.reset(ctx)
          isShowAuthWidgetAtom(ctx, false)
        }}
      >
        <IconX size={20} className="sm:hidden inline" />
        <Typography className="hidden text-nowrap sm:inline font-semibold text-sm">
          Не показывать
        </Typography>
      </Button>
    </div>
  )
}, "AuthWidgetActions")
