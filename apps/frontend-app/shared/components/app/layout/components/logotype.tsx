import { Link } from "@/shared/components/config/link"
import { Typography } from "@/shared/ui/typography"

export const Logotype = () => {
  return (
    <Link
      aria-label="Перейти на главную"
      href="/"
      className="flex h-full w-fit items-center gap-2"
    >
      <img src="/favicon.ico" width={40} height={40} alt="" className="min-w-10 w-10 max-h-10 min-h-10" />
      <Typography className="font-[PIXY] self-end text-3xl">
        Fasberry
      </Typography>
    </Link>
  )
}