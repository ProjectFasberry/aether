import { reatomComponent } from "@reatom/npm-react"
import { Typography } from "@/shared/ui/typography"
import { type ReactNode } from "react"
import { type SettingsSectionItem, settings, settingsState } from "../models/settings.model"
import { BackButton } from "@/shared/ui/back-button"
import { appState } from "@/shared/models/app/index.model"

export const SettingsSection = ({
  title, description, children
}: SettingsSectionItem) => {
  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="flex flex-col gap-1 min-w-0">
        <Typography className="text-lg leading-5 font-semibold">
          {title}
        </Typography>
        <Typography color="gray" className="truncate text-wrap leading-4! text-sm">
          {description}
        </Typography>
      </div>
      {children}
    </div>
  )
}

export const SettingsContentWrapper = reatomComponent<{
  title: string, description?: string, children: ReactNode
}>(({
  ctx, title, description, children
}) => {
  const isMobile = ctx.spy(appState.current.isMobile)
  const isChild = Boolean(ctx.spy(settingsState.target).child)

  return (
    <div className="flex flex-col gap-4 w-full">
      {isMobile && (
        <div className="flex items-center gap-2">
          {isChild && (
            <BackButton
              event="custom"
              onClick={() => settings.back(ctx)}
            />
          )}
          <Typography className="text-xl leading-6 font-semibold">
            {title}
          </Typography>
        </div>
      )}
      {description && (
        <Typography>
          {description}
        </Typography>
      )}
      {children}
    </div>
  )
}, "SettingsContentWrapper")