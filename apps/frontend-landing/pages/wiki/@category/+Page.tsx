import { wikiState } from "@/pages/wiki/(components)/wiki.model";
import { useCtx } from "@reatom/npm-solid-js";
import { createEffect, Show } from "solid-js";
import { useData } from "vike-solid/useData";
import { usePageContext } from "vike-solid/usePageContext";
import { renderToHTMLString } from "@tiptap/static-renderer";
import { editorExtensions as extensions } from "@/shared/components/config/editor";
import { Data } from "./+data";

const Fallback = () => <div class="flex items-center justify-center w-full h-full">Ничего не нашлось</div>;

export default function Page() {
  const ctx = useCtx();
  const pageCtx = usePageContext()
  const data = useData<Data>();

  createEffect(() => {
    wikiState.param(ctx, pageCtx.routeParams.category)
  })

  const contentData = () => data.data?.content ? data.data : null

  return (
    <div class="flex flex-col xl:w-[75%] w-full min-h-[60vh] overflow-hidden lg:w-auto">
      <Show when={contentData()} fallback={<Fallback />}>
        {(resolvedData) => (
          <div
            innerHTML={renderToHTMLString({ extensions, content: resolvedData().content })}
            class="tiptap whitespace-pre-wrap"
          />
        )}
      </Show>
    </div>
  )
}
