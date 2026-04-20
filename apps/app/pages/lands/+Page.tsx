import { Typography } from "@repo/ui/typography"
import { LandsList } from "@/shared/components/app/lands/components/lands-list";
import { getStaticImage } from "@/shared/lib/volume-helpers";
import { PageHeaderImage } from "@/shared/ui/header-image";

const landsImage = getStaticImage("arts/clan-preview.jpg");

export default function Page() {
  return (
    <div className="flex flex-col gap-6 w-full h-full">
      <PageHeaderImage img={landsImage} />
      <div className="flex flex-col gap-4 h-full w-full">
        <Typography className="font-semibold text-3xl">
          Территории сервера
        </Typography>
        <LandsList />
      </div>
    </div>
  )
}