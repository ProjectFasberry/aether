import { ConfigEditor } from "@/shared/components/app/private/components/traefik";
import { ActionsHeader } from "@/shared/components/app/private/components/ui";

export default function Page() {
  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <ActionsHeader title="Traefik dynamic config" />
      <ConfigEditor />
    </div>
  )
}
