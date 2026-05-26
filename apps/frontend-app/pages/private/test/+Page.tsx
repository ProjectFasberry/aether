import { EditorTest } from "@/shared/components/config/editor/editor"
import { Link } from "@/shared/components/config/link"
import { locales } from "@/shared/locales"
import { translate } from "@/shared/locales/helpers"
import { Typography } from "@/shared/ui/typography"
import { usePageContext } from "vike-react/usePageContext"

export default function Page() {
  const pageCtx = usePageContext()

  return (
    <>
      <Typography>
        {translate["shared.change-lang.title"]()}
      </Typography>
      <div className="flex flex-col w-full gap-1">
        {locales.map((locale) => (
          <Link
            key={locale}
            locale={locale}
            href={pageCtx.urlPathname}
            data-state={pageCtx.locale === locale}
            className="data-[state=true]:bg-neutral-600 data-[state=false]:bg-neutral-800 rounded-lg px-2 py-1"
          >
            {locale.toUpperCase()}
          </Link>
        ))}
      </div>
      <div className="bg-neutral-900 rounded-xl">
        <EditorTest />
      </div>
    </>
  )
}
