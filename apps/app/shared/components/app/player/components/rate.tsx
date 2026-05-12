import { reatomComponent } from "@reatom/npm-react"
import { Button } from "@/shared/ui/button"
import { IconHeart } from "@tabler/icons-react"
import { tv } from "tailwind-variants"
import { isIdentityAtom, player } from "../models/player.model"
import { navigate } from "vike/client/router"

const likeButtonVariants = tv({
  base: `flex border-2 group rounded-full duration-300 px-3 py-1 *:duration-300 items-center gap-2`,
  variants: {
    variant: {
      inactive: "border-neutral-700",
      active: "border-red-600/90 bg-red/70 backdrop-blur-md",
      filled: "bg-neutral-50 active:scale-100"
    }
  },
  defaultVariants: {
    variant: "inactive"
  }
})

const rateButtonChildVariants = tv({
  base: `text-lg`,
  variants: {
    variant: {
      default: "",
      rated: `group-data-[state=rated]:fill-neutral-50 group-data-[state=rated]:text-neutral-50`,
      filled: `group-data-[state=filled]:text-neutral-900 group-data-[state=filled]:fill-neutral-900`,
    }
  }
})

type RateProps = {
  isRated: boolean,
  nickname: string,
  count: number
}

export const Rate = reatomComponent<RateProps>(({
  ctx, isRated, nickname, count
}) => {
  const isIdentity = ctx.spy(isIdentityAtom);
  if (isIdentity) return (
    <>
      <Button
        data-state="filled"
        disabled={ctx.spy(player.rate.submit.statusesAtom).isPending}
        className={likeButtonVariants({ variant: "filled" })}
        onClick={() => navigate(`/player/${nickname}/rates`)}
      >
        <IconHeart className={rateButtonChildVariants({ variant: "filled" })} />
        <span className={rateButtonChildVariants({ variant: "filled" })}>
          {count}
        </span>
      </Button>
    </>
  )

  const parentVariant = isRated ? "active" : "inactive"
  const childVariant = isRated ? "rated" : "default"

  return (
    <Button
      data-state={isRated ? "rated" : "unrated"}
      disabled={ctx.spy(player.rate.submit.statusesAtom).isPending}
      onClick={() => player.rate.submit(ctx, nickname)}
      className={likeButtonVariants({ variant: parentVariant })}
    >
      <IconHeart className={rateButtonChildVariants({ variant: childVariant })} />
      <span className={rateButtonChildVariants({ variant: childVariant })}>
        {count}
      </span>
    </Button>
  )
}, "Rate")