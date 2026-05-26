import { editorExtensions } from "@/shared/components/config/editor";
import { Skeleton } from "@/shared/ui/skeleton";
import { useAtom, useCtx } from "@reatom/npm-solid-js";
import { renderToHTMLString } from "@tiptap/static-renderer";
import { For, Index, onMount, Show } from "solid-js";
import { rules } from "../(models)/rules.model";
import { getDayjs } from "@/shared/lib/create-dayjs";
import { Typography } from "@/shared/ui/typography";

const RuleItem = (props: { content: any }) => {
  const html = renderToHTMLString({
    extensions: editorExtensions,
    content: props.content
  });

  return <div innerHTML={html} class="tiptap whitespace-pre-wrap" />
}

const RulesItemSkeleton = () => {
  return (
    <div class="card-wrapper flex flex-col gap-4 w-full h-full">
      <Skeleton class="w-1/3 h-10" />
      <div class="flex flex-col *:h-4 gap-1 w-full">
        <Skeleton class="w-full" />
        <Skeleton class="w-1/3" />
        <Skeleton class="w-2/3" />
        <Skeleton class="w-1/2" />
        <Skeleton class="w-full" />
        <Skeleton class="w-1/4" />
      </div>
    </div>
  )
}

export const RulesSkeleton = () => {
  return (
    <Index each={Array.from({ length: 5 })}>
      {() => <RulesItemSkeleton />}
    </Index>
  )
}

export const Rules = () => {
  const ctx = useCtx()

  onMount(() => {
    rules.fetchList(ctx)
  })

  const [dataAtom] = useAtom(rules.fetchList.dataAtom)
  const [statusesAtom] = useAtom(rules.fetchList.statusesAtom);

  const dayjs = getDayjs();

  return (
    <Show
      when={!statusesAtom().isPending}
      fallback={<RulesSkeleton />}
    >
      <Show
        when={!statusesAtom().isRejected || dataAtom()}
        fallback={
          <Typography class="text-2xl dark:text-neutral-400 text-neutral-600">
            Не удалось получить список правил
          </Typography>
        }
      >
        <Show when={dataAtom()}>
          {(data) => (
            <For each={data()}>
              {(item) => (
                <div class="card-wrapper flex flex-col gap-4 w-full h-full">
                  <Typography class="text-2xl font-semibold">
                    {item.category}
                  </Typography>
                  <RuleItem content={item.content} />
                  {item.updated_at && (
                    <div class="flex items-center w-full justify-end">
                      <Typography title={dayjs(item.updated_at).format("DD.MM.YYYY hh:mm")} class="text-neutral-400">
                        Обновлено: {dayjs(item.updated_at).fromNow()}
                      </Typography>
                    </div>
                  )}
                </div>
              )}
            </For>
          )}
        </Show>
      </Show>
    </Show>
  );
}
