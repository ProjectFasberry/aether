import { Button } from "@/shared/ui/button"
import { IconArrowLeft } from "@tabler/icons-react"
import { navigate } from "vike/client/router"

type BackButtonProps = {
  event?: "history" | "custom",
  href?: string, 
  onClick?: () => void
}

export const BackButton = ({ href, onClick, event = "history" }: BackButtonProps) => {
  const handle = () => {
    if (event === 'history') {
      return href ? navigate(href) : window.history.back()
    }

    if (!onClick) {
      console.warn(BackButton.name, "Event is not defined")
      return;
    }

    onClick()
  }

  return (
    <Button
      background="default"
      onClick={handle}
      className="min-h-8 h-8 sm:min-h-8 sm:h-8 p-0 aspect-square w-fit"
    >
      <IconArrowLeft className="size-4 sm:size-5 text-neutral-400" />
    </Button>
  )
}