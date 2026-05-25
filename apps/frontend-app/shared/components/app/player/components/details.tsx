import { Button } from "@/shared/ui/button";
import { Typography } from "@/shared/ui/typography"
import { Link } from "@/shared/components/config/link";
import { translate } from "@/shared/locales/helpers";

export const PurchasesHistory = () => {
  return (
    <div className="flex items-center gap-2 justify-between w-full">
      <div className="flex flex-col min-w-0">
        <Typography color="white" className="text-2xl font-semibold">
          {translate["player.purchases.title"]()}
        </Typography>
        <Typography color="gray" className="truncate">
          {translate["player.purchases.subtitle"]()}
        </Typography>
      </div>
      <Link href="/store/cart/orders">
        <Button background="white" className="w-fit">
          <Typography className="font-semibold">
            {translate["player.purchases.goTo"]()}
          </Typography>
        </Button>
      </Link>
    </div>
  )
}