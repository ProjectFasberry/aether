import { Button } from "@repo/ui/button"
import { IconArrowLeft } from "@tabler/icons-react"
import { navigate } from "vike/client/router"

export const BackButton = ({ href }: { href?: string }) => {
  return (
    <Button
      background="default"
      onClick={() => href ? navigate(href) : window.history.back()}
      className="h-10 p-0 aspect-square w-fit"
    >
      <IconArrowLeft size={22} className='text-neutral-400' />
    </Button>
  )
}