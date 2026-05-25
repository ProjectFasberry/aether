import { getUrl } from "@/shared/lib/helpers"
import { wrapTitle } from "@/shared/lib/wrap-title"
import { useConfig } from "vike-react/useConfig"
import { PageContext } from "vike/types"

export const data = async (pageContext: PageContext) => {
  const config = useConfig()

  const title = wrapTitle("Модпаки")

  config({
    title,
    Head: (
      <>
        <link rel="canonical" href={getUrl(pageContext)} />
        <meta property="og:url" content={getUrl(pageContext)} />
        <meta property="og:title" content={title} />
        <meta property="og:site_name" content={title} />
        <meta name="twitter:title" content={title}/>
      </>
    )
  })
}