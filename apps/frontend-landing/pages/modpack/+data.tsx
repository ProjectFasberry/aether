import { getUrl, wrapTitle } from "@/shared/lib/helpers"
import { useConfig } from "vike-solid/useConfig"
import { PageContext } from "vike/types"

export async function data(pageCtx: PageContext) {
  const config = useConfig()

  const title = wrapTitle("Модпаки")

  config({
    title,
    Head: (
      <>
        <link rel="canonical" href={getUrl(pageCtx)} />
        <meta property="og:url" content={getUrl(pageCtx)} />
        <meta property="og:title" content={title} />
        <meta property="og:site_name" content={title} />
        <meta name="twitter:title" content={title}/>
      </>
    )
  })
}
