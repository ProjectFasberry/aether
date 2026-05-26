import { For, onMount, Show } from "solid-js";
import { rules } from "../(models)/rules.model";
import { useAtom, useCtx } from "@reatom/npm-solid-js";
import { Skeleton } from "@/shared/ui/skeleton";
import { tv } from "tailwind-variants";

const rulesTagVariant = tv({
  base: `flex bg-neutral-800 items-center rounded-sm text-xs md:text-base lg:text-md px-2`
})

export const RulesTagsSkeleton = () => {
  return (
    <>
      <Skeleton class={rulesTagVariant({ className: "h-6 w-24" })} />
      <Skeleton class={rulesTagVariant({ className: "h-6 w-8" })} />
      <Skeleton class={rulesTagVariant({ className: "h-6 w-14" })} />
      <Skeleton class={rulesTagVariant({ className: "h-6 w-12" })} />
    </>
  )
}

export const RulesTags = () => {
  const ctx = useCtx();

  onMount(() => {
    rules.fetchTags(ctx)
  })

  const [dataAtom] = useAtom(rules.fetchTags.dataAtom)
  const [statusesAtom] = useAtom(rules.fetchTags.statusesAtom);

  return (
    <Show
      when={!statusesAtom().isPending}
      fallback={<RulesTagsSkeleton />}
    >
      <Show
        when={dataAtom()}
        fallback={null}
      >
        {(data) => (
          <For each={data()}>
            {(item) => (
              <div class={rulesTagVariant()}>
                {item.title.toLowerCase()}
              </div>
            )}
          </For>
        )}
      </Show>
    </Show>
  )
}
