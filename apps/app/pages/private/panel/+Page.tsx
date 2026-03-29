import { ConfigEditor } from "@/shared/components/app/private/components/traefik";
import { ActionsHeader } from "@/shared/components/app/private/components/ui";

export default function Page() {
  return (
    <>
      <div className="flex flex-col gap-4 w-full h-full bg-neutral-900 rounded-xl p-4">
        <ActionsHeader title="Traefik dynamic config" />
        <ConfigEditor />
      </div>
    </>
  )
}