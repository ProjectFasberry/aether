import { Typography } from "@/shared/ui/typography"
import { getStaticImage } from "@/shared/lib/volume-helpers";
import { type PropsWithChildren } from "react";
import { PageHeaderImage } from "@/shared/ui/header-image";
import { BackButton } from "@/shared/ui/back-button";
import { usePageContext } from "vike-react/usePageContext";
import { translate } from "@/shared/locales/helpers";

const ratingsImage = getStaticImage("arts/sand-camel.jpg")

const RatingsHeader = () => {
  const pageCtx = usePageContext();
  const isValid = pageCtx.urlPathname !== '/ratings'

  return (
    <div className="flex items-center gap-2">
      {isValid && <BackButton href="/ratings" />}
      <Typography className="font-semibold text-3xl">{translate["ratings.title"]()}</Typography>
    </div>
  )
}

export default function Layout({ children }: PropsWithChildren) {
  return (
    <div className="flex flex-col gap-6 w-full h-full">
      <PageHeaderImage
        img={ratingsImage}
        imgAlign="center"
      />
      <div className="flex flex-col gap-4 h-full w-full">
        <RatingsHeader />
        {children}
      </div>
    </div>
  )
}