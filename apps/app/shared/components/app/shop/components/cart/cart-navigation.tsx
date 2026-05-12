import { scrollableVariant } from "@/shared/consts/style-variants"
import { BackButton } from "@/shared/ui/back-button"
import { Button } from "@/shared/ui/button"
import { usePageContext } from "vike-react/usePageContext"
import { navigate } from "vike/client/router"

const STORE_BADGES = [
  { title: "Корзина", value: "" },
  { title: "Заказы", value: "/orders" },
  { title: "Пополнить счет", value: "/topup", variant: "active" },
] as const;

export const CartNavigation = () => {
  const pageCtx = usePageContext()
  const isActive = (path: string) => pageCtx.urlPathname === path;

  return (
    <div className={scrollableVariant({ className: "flex items-center overflow-x-auto scrollbar-h-2 gap-1 w-full" })}>
      <BackButton href="/store" />
      {STORE_BADGES.map((badge) => (
        <Button
          key={badge.value}
          background={isActive(`/store/cart${badge.value}`) ? "white" : "default"}
          onClick={() => navigate(`/store/cart${badge.value}`)}
          className="h-8 sm:h-8 text-sm text-nowrap font-semibold"
        >
          {badge.title}
        </Button>
      ))}
    </div>
  )
}