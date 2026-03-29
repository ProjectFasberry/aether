import { Link } from "@/shared/components/config/link"
import { scrollableVariant } from "@/shared/consts/style-variants"
import { BackButton } from "@/shared/ui/back-button"
import { Button } from "@repo/ui/button"
import { Typography } from "@repo/ui/typography"

const badge = (title: string, value: string) => ({ title, value });

const STORE_BADGES = [
  badge("Корзина", ""),
  badge("Заказы", "/orders"),
  badge("Пополнить баланс", "/topup"),
  badge("Настройки", "/settings"),
] as const;

export const CartNavigation = () => {
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
            className="group-data-[state=active]:text-neutral-950 group-data-[state=inactive]:text-neutral-50
             h-10 group-data-[state=active]:bg-neutral-50 rounded-xl group-data-[state=inactive]:bg-neutral-800 text-nowrap"
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