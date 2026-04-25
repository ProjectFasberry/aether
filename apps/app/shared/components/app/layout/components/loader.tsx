import { Typography } from "@repo/ui/typography";
import { IconLoader2 } from "@tabler/icons-react";
import { useEffect } from "react";

export type LoaderProps = { title: string, subtitle?: string }

export const LoaderNode = ({ title, subtitle }: LoaderProps) => {
  useEffect(() => {
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  return (
    <div
      className="
        flex flex-col gap-4 fixed inset-0 supports-backdrop-filter:backdrop-blur-xs bg-black/60
        pointer-events-auto overflow-hidden duration-300 z-100 items-center justify-center h-full w-full
      "
    >
      <IconLoader2 className="animate-spin" size={40} />
      <Typography className="font-semibold text-xl">{title}</Typography>
      {subtitle && (
        <Typography color="gray" className="text-sm">{subtitle}</Typography>
      )}
    </div>
  )
}