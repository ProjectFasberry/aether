import { Typography } from "@repo/ui/typography";
import { getStaticImage } from "@/shared/lib/volume-helpers";
import { PropsWithChildren } from "react";
import { PageHeaderImage } from "@/shared/ui/header-image";

const ratingsImage = getStaticImage("arts/sand-camel.jpg")

export default function Layout({ children }: PropsWithChildren) {
  return (
    <div className="flex flex-col gap-6 w-full h-full">
      <PageHeaderImage
        img={ratingsImage}
        imgAlign="center"
      />
      <div className="flex flex-col gap-4 h-full w-full">
        <Typography className="font-semibold text-3xl">Рейтинги сервера</Typography>
        {children}
      </div>
    </div>
  )
}