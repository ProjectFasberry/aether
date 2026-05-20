import { type PropsWithChildren } from "react"
import { Sidebar } from "@/shared/components/app/private/components/sidebar";

export default function Layout({ children }: PropsWithChildren) {
  return (
    <div className="flex flex-col lg:flex-row w-full relative p-2 lg:p-6 h-full gap-4">
      <Sidebar />
      <div className="flex flex-col gap-2 min-h-dvh w-full lg:w-4/5 p-2 bg-neutral-900 rounded-xl lg:p-3">
        {children}
      </div>
    </div>
  )
}
