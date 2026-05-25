import { TopUpExchanges, TopupForm } from "@/shared/components/app/shop/components/wallet/top-up";
import { topup, topupState } from "@/shared/components/app/shop/models/store-top-up.model";
import { createPageModel } from "@/shared/lib/events";
import { getStaticImage } from "@/shared/lib/volume-helpers";
import { pageState } from "@/shared/models/page-context.model";
import { useAtom } from "@reatom/npm-react";
import { Typography } from "@/shared/ui/typography"

const boostsImg = getStaticImage("icons/boosts_icon.png")

const page = createPageModel({
  name: "topup",
  onSpyAction: (ctx, dataAtom, urlParsed) => {
    topupState.search(ctx, (state) => urlParsed?.search ?? state);
    topup.fetchExchange(ctx)
  },
  spyedAtom: pageState.urlParsed
})

export default function Page() {
  const [_] = useAtom(page.dataAtom)

  return (
    <div className="flex flex-col h-full gap-6 w-full">
      <div className="flex items-center gap-4 rounded-lg p-3 bg-blue-600/60 backdrop-blur-sm">
        <img src={boostsImg} width={122} height={122} alt="" />
        <div className="flex flex-col gap-3 *:font-medium text-lg">
          <Typography>1. Введите желаемое кол-во валюты</Typography>
          <Typography>2. Выберите способ оплаты</Typography>
          <Typography>3. Оплатите</Typography>
        </div>
      </div>
      <div className="flex items-start justify-between gap-6 sm:flex-row flex-col w-full">
        <TopupForm />
        <div className="flex w-full sm:w-[40%] h-full">
          <div className="flex items-center justify-between w-full h-full gap-2">
            <TopUpExchanges />
          </div>
        </div>
      </div>
    </div>
  )
}