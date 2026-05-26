import { ClientOnly } from "vike-solid/ClientOnly"
import { Toaster as ToasterInit } from 'solid-sonner'
import { getStaticObject } from "@/shared/lib/helpers"

const img = getStaticObject("minecraft/icons", "book_big.webp")

const icons = {
  info: <img width={32} height={32} alt="" loading="lazy" draggable={false} src={img} />,
  error: <img width={32} height={32} alt="" loading="lazy" draggable={false} src={img} />,
  success: <img width={32} height={32} alt="" loading="lazy" draggable={false} src={img} />,
  warning: <img width={32} height={32} alt="" loading="lazy" draggable={false} src={img} />
}

export const Toaster = () => {
  return (
    <ClientOnly>
      <ToasterInit
        position="top-left"
        richColors
        icons={icons}
      />
    </ClientOnly>
  )
}
