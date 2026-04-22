import { getStaticImage } from "@/shared/lib/volume-helpers"
import { ClientOnly } from "vike-react/ClientOnly"
import { Toaster as ToasterInit } from "sonner"

const icons = {
  info: <img width={32} height={32} alt="" loading="lazy" draggable={false} src={getStaticImage("icons/challenges_icon.png")} />,
  error: <img width={32} height={32} alt="" loading="lazy" draggable={false} src={getStaticImage("icons/challenges_icon.png")} />,
  success: <img width={32} height={32} alt="" loading="lazy" draggable={false} src={getStaticImage("icons/challenges_icon.png")} />,
  warning: <img width={32} height={32} alt="" loading="lazy" draggable={false} src={getStaticImage("icons/challenges_icon.png")} />
}

export const Toaster = () => {
  return (
    <ClientOnly>
      <ToasterInit
        position="top-left"
        toastOptions={{
          classNames: {
            success: "text-green-500!",
            info: "text-neutral-950!",
            error: "text-red!",
            warning: "text-yellow-500!",
          },
        }}
        icons={icons}
      />
    </ClientOnly>
  )
}