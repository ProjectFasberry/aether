import { useConfig } from 'vike-react/useConfig'
import { wrapTitle } from "@/shared/lib/utils"
import { getStaticImage } from '@/shared/lib/volume-helpers'
import { type PageContextServer } from 'vike/types'
import { logRouting } from '@/shared/lib/log'

const title = wrapTitle(`Рейтинги игроков`)
const previewImage = getStaticImage("arts/adventure-in-blossom.jpg")

function metadata() {
  return {
    title,
    description: "Актуальные рейтинги игроков в разных категориях",
    image: previewImage,
  }
}

export async function data(pageCtx: PageContextServer) {
  logRouting(pageCtx.urlPathname, "data");

  const config = useConfig()
  config(metadata())
}