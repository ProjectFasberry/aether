import { reatomComponent } from "@reatom/npm-react"
import { Typography } from "@/shared/ui/typography"
import { tv } from "tailwind-variants"
import { widgetsState } from "../models/widgets.model"
import { AuthWidgetActions } from "./widget-variants"
import { type ReactNode } from "react"

const widgetVariant = tv({
  base: `flex items-center p-2 sm:p-3 lg:p-4 gap-2 sm:gap-4 
    justify-between rounded-lg w-full overflow-hidden max-h-16 bg-neutral-800`
})

const WIDGETS_COMPONENTS: Record<string, ReactNode> = {
  "auth.required": <AuthWidgetActions />
}

export const Widgets = reatomComponent(({ ctx }) => {
  const active = ctx.spy(widgetsState.current)
  if (!active) return null;

  const { icon: Icon, id, description, title } = active
  const action = WIDGETS_COMPONENTS[id]

  return (
    <div
      id="widgets"
      className="hidden z-10 sm:flex items-center justify-center w-full fixed bottom-2 left-0 right-0"
    >
      <div className="mx-auto responsive">
        <div
          className={widgetVariant()}
        >
          <div className="flex items-center gap-2 sm:gap-4">
            {Icon && (
              <div className="flex items-center justify-center bg-white/20 rounded-xl h-10 aspect-square shrink-0">
                <Icon size={26} />
              </div>
            )}
            <div className="flex flex-col justify-center min-w-0">
              <Typography className="truncate w-full font-semibold text-base whitespace-nowrap">
                {title}
              </Typography>
              {description && (
                <Typography
                  color="gray"
                  className="hidden xl:inline truncate text-[12px] leading-5 whitespace-nowrap"
                >
                  {description}
                </Typography>
              )}
            </div>
          </div>
          {action && (
            <div className="w-fit flex items-center justify-center shrink-0">
              {action}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}, "Widgets")