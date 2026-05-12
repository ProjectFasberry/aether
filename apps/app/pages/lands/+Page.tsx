import { Typography } from "@/shared/ui/typography"
import { LandsList } from "@/shared/components/app/lands/components/lands-list";
import { getStaticImage } from "@/shared/lib/volume-helpers";
import { PageHeaderImage } from "@/shared/ui/header-image";
import { translate } from "@/shared/locales/helpers";
import { createPageModel } from "@/shared/lib/events";
import { landsAction } from "@/shared/components/app/lands/models/lands.model";
import { useAtom } from "@reatom/npm-react";

const landsImage = getStaticImage("arts/clan-preview.jpg");

const page = createPageModel({
  name: "lands",
  onConnAction: (ctx, dataAtom) => {
    landsAction(ctx)
  }
})

export default function Page() {
  const [_] = useAtom(page.dataAtom);
  
  return (
    <div className="flex flex-col gap-6 w-full h-full">
      <PageHeaderImage img={landsImage} />
      <div className="flex flex-col gap-4 h-full w-full">
        <Typography className="font-semibold text-3xl">
          {translate["lands.title"]()}
        </Typography>
        <LandsList />
      </div>
    </div>
  )
}