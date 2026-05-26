import { useAtom, useCtx } from "@reatom/npm-solid-js";
import { createMemo, For, Show } from "solid-js";
import { tv } from "tailwind-variants";
import { IDEAS, selectedKeyAtom } from "../(models)/gameplay.model";
import { Typography } from "@/shared/ui/typography";
import { Link } from "@/shared/components/config/link";
import { atom } from "@reatom/framework";
import { getStaticObject } from "@/shared/lib/helpers";

const prevImg = getStaticObject("minecraft/icons", "large-arrow-left-hover.png")
const nextImg = getStaticObject("minecraft/icons", "large-arrow-right-hover.png")

export const IdeaMainNavigation = (props: { type: "next" | "prev" }) => {
  const ctx = useCtx();

  return (
    <div
      class="flex items-center justify-center gap-4 h-10 aspect-square w-6 cursor-pointer"
      onClick={() => selectedKeyAtom[props.type](ctx)}
    >
      <img
        src={props.type === 'prev' ? prevImg : nextImg}
        width={20}
        loading="lazy"
        height={20}
        alt=""
      />
    </div>
  )
}

const navigationBadge = tv({
  base: `tr border-2 justify-center border-neutral-900 cursor-pointer duration-300 px-4 py-2`,
  variants: {
    variant: { unselected: "text-neutral-50", selected: "", }
  }
})
const previewCard = tv({
  base: `flex flex-col sm:flex-row relative sm:items-center w-full gap-2 lg:w-2/3
		overflow-hidden p-4 sm:p-6 xl:p-14 h-[320px] lg:h-[460px] lg:max-w-full justify-start rounded-xl`,
  variants: {
    variant: { module: `bg-neutral-300`, full: `` }
  }
})
const previewChildCard = tv({
  base: `flex z-[3] flex-col relative `,
  variants: {
    variant: { module: `sm:w-2/4 w-full`, full: `sm:w-2/3 w-full` }
  }
})
const previewTitle = tv({
  base: `mb-2 sm:mb-4 text-xl sm:text-3xl lg:text-4xl`,
  variants: {
    variant: { full: `text-neutral-50`, module: `text-neutral-900` }
  }
})
const previewDescription = tv({
  base: `text-base sm:text-lg lg:text-xl`,
  variants: {
    variant: { full: `text-neutral-200`, module: `text-neutral-900` }
  }
})
const previewLink = tv({
  base: `text-base sm:text-lg`,
  variants: {
    variant: { full: `text-neutral-300`, module: `text-neutral-700` }
  }
})

export const IdeaPreviewCard = () => {
  const [selectedAtom] = useAtom(selectedKeyAtom)

  const idea = createMemo(() => IDEAS[selectedAtom()]);
  const variant = idea().type as "module" | "full"

  return (
    <div class={previewCard({ variant })}>
      {idea().type === 'full' && (
        <div class="absolute top-0 bottom-0 right-0 left-0 w-full h-full">
          <div class="absolute left-0 h-full w-full z-[2] bg-gradient-to-r from-neutral-900/60 via-transparent to-transparent" />
          <img
            src={idea().image}
            loading="lazy"
            alt=""
            width={1000}
            height={1000}
            class="brightness-[55%] w-full h-full object-cover"
          />
        </div>
      )}
      <div class={previewChildCard({ variant })}>
        <Typography class={previewTitle({ variant })}>
          {idea().title}
        </Typography>
        <Typography class={previewDescription({ variant })}>
          {idea().description}
        </Typography>
        <Show when={idea().link}>
          {(item) =>
            <Link href={item().href} class="w-fit mt-2 sm:mt-4 underline underline-offset-8">
              <Typography class={previewLink({ variant })}>
                {item().title}
              </Typography>
            </Link>
          }
        </Show>
      </div>
      {idea().type === 'module' && (
        <div class="flex items-center justify-center w-full sm:w-2/4 h-full">
          <img
            src={idea().image}
            loading="lazy"
            alt=""
            width={1000}
            height={1000}
            class="w-full h-full object-cover rounded-xl"
          />
        </div>
      )}
    </div>
  )
}

const getIsActiveAtom = (id: number) => atom((ctx) => ctx.spy(selectedKeyAtom) === id)

const Item = (props: { idx: number, title: string }) => {
  const ctx = useCtx();
  const [isActive] = useAtom(getIsActiveAtom(props.idx))

  return (
    <div
      data-state={isActive() ? "active" : "inactive"}
      onClick={() => selectedKeyAtom(ctx, props.idx)}
      class={navigationBadge()}
    >
      <Typography class="truncate">{props.title}</Typography>
    </div>
  )
}

export const IdeasList = () => {
  return (
    <For each={IDEAS}>
      {(preview, idx) =>
        <>
          <Item idx={idx()} title={preview.title} />
          {(idx() + 1) < IDEAS.length && <hr class="w-4 h-[1px] border-2 border-neutral-900" />}
        </>
      }
    </For>
  )
}
