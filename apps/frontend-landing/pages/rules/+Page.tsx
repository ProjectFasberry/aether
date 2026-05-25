import { client } from "@/shared/api/client";
import { Link } from "@/shared/components/config/link";
import { getStaticObject } from "@/shared/lib/volume";
import { reatomAsync, withCache, withDataAtom, withStatusesAtom } from "@reatom/async";
import { reatomComponent, useUpdate } from "@reatom/npm-react";
import { Button } from "@repo/ui/button";
import { MainWrapperPage } from "@repo/ui/main-wrapper";
import { Overlay } from "@repo/ui/overlay";
import { Skeleton } from "@repo/ui/skeleton";
import { Typography } from "@repo/ui/typography";
import { WrapperTitle } from "@repo/ui/wrapper-title";
import { tv } from "tailwind-variants";
import { JSONContent } from "@tiptap/react"
import { renderToHTMLString } from '@tiptap/static-renderer'
import { editorExtensions } from "@/shared/components/config/editor";
import { dayjs } from "@/shared/lib/create-dayjs";
import { sectionVariant, sectionVariantChild } from "@/shared/styles/variants";
import { ClientOnly } from "vike-react/ClientOnly";

type RulesTag = {
  title: string,
  value: string
}

const rulesTagsAction = reatomAsync(async (ctx) => {
  return await ctx.schedule(async () => {
    const res = await client("shared/rules/tags")
    const data = await res.json<{ data: RulesTag[] } | { error: string }>()

    if ("error" in data) throw new Error(data.error)

    return data.data
  })
}).pipe(withStatusesAtom(), withCache({ swr: false }), withDataAtom())

const rulesTagVariant = tv({
  base: `flex bg-neutral-500 items-center rounded-sm text-xs md:text-base lg:text-md px-2`
})

const RulesTagsSkeleton = () => {
  return (
    <>
      <Skeleton className={rulesTagVariant({ className: "h-6 w-24" })} />
      <Skeleton className={rulesTagVariant({ className: "h-6 w-8" })} />
      <Skeleton className={rulesTagVariant({ className: "h-6 w-14" })} />
      <Skeleton className={rulesTagVariant({ className: "h-6 w-12" })} />
    </>
  )
}

const RulesTags = reatomComponent(({ ctx }) => {
  useUpdate(rulesTagsAction, []);

  const data = ctx.spy(rulesTagsAction.dataAtom);

  if (ctx.spy(rulesTagsAction.statusesAtom).isPending) {
    return <RulesTagsSkeleton />
  }

  if (!data) return null;

  return (
    <>
      {data.map((item) => (
        <div key={item.value} className={rulesTagVariant()}>
          {item.title.toLowerCase()}
        </div>
      ))}
    </>
  )
}, "RulesTags")

type RulesType = {
  id: number,
  content: JSONContent,
  category: string,
  updated_at: Date | null,
  created_at: Date
}

const rulesAction = reatomAsync(async (ctx) => {
  return await ctx.schedule(async () => {
    const res = await client("shared/rules/list", { signal: ctx.controller.signal, throwHttpErrors: false })
    const data = await res.json<{ data: RulesType[] } | { error: string }>()
    if ("error" in data) return null;
    return data.data
  })
}, "rulesAction").pipe(
  withDataAtom(null),
  withCache({ swr: false }),
  withStatusesAtom()
)

const RuleItem = ({ content }: { content: JSONContent }) => {
  const html = renderToHTMLString({
    extensions: editorExtensions,
    content
  })

  return (
    <div
      dangerouslySetInnerHTML={{ __html: html }}
      className="tiptap whitespace-pre-wrap"
    />
  )
}

const RulesItemSkeleton = () => {
  return (
    <div className="card-wrapper flex flex-col gap-4 w-full h-full">
      <Skeleton className="w-1/3 h-10" />
      <div className="flex flex-col *:h-4 gap-1 w-full">
        <Skeleton className="w-full" />
        <Skeleton className="w-1/3" />
        <Skeleton className="w-2/3" />
        <Skeleton className="w-1/2" />
        <Skeleton className="w-full" />
        <Skeleton className="w-1/4" />
      </div>
    </div>
  )
}

const RulesSkeleton = () => {
  return (
    <>
      <RulesItemSkeleton />
      <RulesItemSkeleton />
      <RulesItemSkeleton />
      <RulesItemSkeleton />
    </>
  )
}

const Rules = reatomComponent(({ ctx }) => {
  useUpdate(rulesAction, []);

  const data = ctx.spy(rulesAction.dataAtom);

  if (ctx.spy(rulesAction.statusesAtom).isPending) {
    return <RulesSkeleton />
  }

  if (ctx.spy(rulesAction.statusesAtom).isRejected || !data) {
    return (
      <Typography className="text-2xl dark:text-neutral-400 text-neutral-600">
        Не удалось получить список правил
      </Typography>
    )
  }

  return (
    data.map((item) => (
      <div key={item.id} className="card-wrapper flex flex-col gap-4 w-full h-full">
        <Typography className="text-2xl font-semibold">
          {item.category}
        </Typography>
        <RuleItem key={item.id} content={item.content} />
        {item.updated_at && (
          <div className="flex items-center w-full justify-end">
            <Typography title={dayjs(item.updated_at).format("DD.MM.YYYY hh:mm")} className="text-neutral-400">
              Обновлено: {dayjs(item.updated_at).fromNow()}
            </Typography>
          </div>
        )}
      </div>
    ))
  );
}, "Rules")

const url = getStaticObject("backgrounds", "rules_background.png")

export default function Page() {
  return (
    <MainWrapperPage variant="with_section">
      <div
        className={sectionVariant({ className: "bg-bottom md:bg-center bg-cover" })}
        style={{ backgroundImage: `url(${url})` }}
      >
        <Overlay variant="default" />
        <WrapperTitle>
          <div className="flex flex-col gap-6 w-full lg:max-w-3xl items-start justify-start">
            <div className="flex flex-col gap-2 lg:max-w-3xl">
              <h1 className={sectionVariantChild().title({ className: "text-gold" })}>
                Правила проекта
              </h1>
              <Typography color="white" className={sectionVariantChild().subtitle()}>
                Правила созданы для чего? Чтобы их не нарушать!
              </Typography>
            </div>
            <Link href="#rules-list" className={sectionVariantChild().action()}>
              <Button variant="minecraft" className="w-full px-6 py-0.5 gap-2">
                <Typography color="white" className="text-lg">
                  Список правил
                </Typography>
              </Button>
            </Link>
          </div>
        </WrapperTitle>
      </div>
      <div className="full-screen-section py-32">
        <div className="flex flex-col gap-10 responsive mx-auto">
          <div
            className="card-wrapper flex flex-col md:flex-row w-full gap-2 justify-between"
          >
            <div className="flex flex-col lg:flex-row items-start lg:items-center gap-2">
              <Typography title="Актуальные теги" color="white" className="text-md lg:text-lg xl:text-xl">
                Актуальные теги:
              </Typography>
              <div className="flex flex-wrap gap-2">
                <ClientOnly fallback={<RulesTagsSkeleton />} >
                  <RulesTags />
                </ClientOnly>
              </div>
            </div>
          </div>
          <div id="rules-list" className="flex flex-col gap-6 w-full h-full">
            <ClientOnly fallback={<RulesSkeleton />} >
              <Rules />
            </ClientOnly>
          </div>
        </div>
      </div>
    </MainWrapperPage>
  )
}
