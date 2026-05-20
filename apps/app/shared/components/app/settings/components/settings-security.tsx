import { SettingsContentWrapper, SettingsSection } from "./ui"
import { type SettingsSectionItem } from "../models/settings.model"

const SECURITY_SECTIONS: SettingsSectionItem[] = []

export const SettingsMainSecurity = () => {
  return (
    <SettingsContentWrapper title="Безопасность">
      <div className="flex flex-col gap-8 w-full h-full">
        {SECURITY_SECTIONS.map((section, idx) => <SettingsSection key={idx} {...section} />)}
      </div>
    </SettingsContentWrapper>
  )
}