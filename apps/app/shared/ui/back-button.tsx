import { Button } from "@repo/ui/button"
import { IconArrowLeft } from "@tabler/icons-react"
import { navigate } from "vike/client/router"

type BackButtonProps = {
  event?: "history" | "custom",
  href?: string, 
  onClick?: () => void
}

export const BackButton = ({ href, onClick, event = "history" }: BackButtonProps) => {
  return (
    <Button
      background="default"
      onClick={() => {
        if (event === 'history') {
          return href ? navigate(href) : window.history.back()
        }

        return onClick?.()
      }}
      className="min-h-8 h-8 sm:min-h-8 sm:h-8 p-0 aspect-square w-fit text-neutral-400"
    >
      <IconArrowLeft className="size-[16px] sm:size-[20px]" />
    </Button>
  )
}