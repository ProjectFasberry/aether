import { Link } from "@/shared/components/config/link"
import { scrollableVariant } from "@/shared/consts/style-variants"
import { BackButton } from "@/shared/ui/back-button"
import { Button } from "@repo/ui/button"
import { Typography } from "@repo/ui/typography"
import { usePageContext } from "vike-react/usePageContext"

const badge = (title: string, value: string) => ({ title, value });

const STORE_BADGES = [
  badge("Корзина", ""),
  badge("Заказы", "/orders"),
  badge("Пополнить баланс", "/topup"),
] as const;

export const CartNavigation = () => {
  const pageCtx = usePageContext()
  const isActive = (path: string) => pageCtx.urlPathname === path;

  return (
    <div
      className={scrollableVariant({
        className: "flex items-center overflow-x-auto scrollbar-h-2 gap-1 sm:w-full"
      })}
    >
      <BackButton href="/store" />
      {STORE_BADGES.map((badge) => (
        <Link
          key={badge.value}
          href={`/store/cart${badge.value}`}
          className="group"
        >
          <Button
            background={isActive(`/store/cart${badge.value}`) ? "white" : "default"}
            className="h-10 text-nowrap"
          >
            <Typography className="font-semibold">
              {badge.title}
            </Typography>
          </Button>
        </Link>
      ))}
    </div>
  )
}