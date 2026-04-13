import { onConnect } from "@reatom/framework"
import { reatomComponent } from "@reatom/npm-react"
import { Typography } from "@repo/ui/typography"
import { tv } from "tailwind-variants"
import { motion } from "motion/react"
import { activeWidgetAtom, initWidgets, Widget as WidgetProps } from "../models/widgets.model"

const widgetVariant = tv({
  base: `flex items-center p-2 sm:p-3 lg:p-4 gap-2 sm:gap-4 
    justify-between rounded-lg w-full overflow-hidden max-h-16 bg-neutral-800`
})

const Widget = ({ title, icon: Icon, description, action }: WidgetProps) => {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 50, scale: 0.5 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.9 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
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
    </motion.div>
  )
}

onConnect(activeWidgetAtom, initWidgets)

export const Widgets = reatomComponent(({ ctx }) => {
  const active = ctx.spy(activeWidgetAtom)
  if (!active) return null;

  return (
    <div
      id="widgets"
      className="hidden z-[1] sm:flex items-center justify-center w-full fixed bottom-2 left-0 right-0"
    >
      <div className="mx-auto responsive">
        <Widget {...active} />
      </div>
    </div>
  )
}, "Widgets")