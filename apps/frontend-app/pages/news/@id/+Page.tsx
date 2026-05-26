import dayjs from "@/shared/lib/create-dayjs";
import { reatomComponent, useUpdate } from "@reatom/npm-react";
import { Typography } from "@/shared/ui/typography"
import { IconEye, IconPencil } from "@tabler/icons-react";
import { newsState } from "@/shared/components/app/news/models/news.model";
import { renderToHTMLString } from '@tiptap/static-renderer'
import type { JSONContent } from "@tiptap/react";
import { Avatar } from "@/shared/ui/avatar";
import { createLink, Link } from "@/shared/components/config/link";
import { createActionsLinkValueAction } from "@/shared/components/app/private/models/actions.model";
import { getDataFromSnapshot } from "@/shared/models/app/utils";
import { usePageContext } from "vike-react/usePageContext";
import { atom } from "@reatom/framework";
import { editorExtensions } from "@/shared/components/config/editor/editor.model";

const editLinkAtom = atom("");

const NewsEdit = reatomComponent<{ id: number }>(({ ctx, id }) => {
  useUpdate(() => {
    const params = new URLSearchParams(
      createActionsLinkValueAction(ctx, {
        parent: "news", type: "edit", target: id.toString()
      }).next
    )

    editLinkAtom(ctx, `/private/config?${params}`)
  }, [])

  return (
    <Link href={ctx.spy(editLinkAtom)} className="flex items-center font-semibold gap-2 bg-neutral-800 w-fit">
      <Typography color="gray">
        Редактировать
      </Typography>
      <IconPencil size={18} />
    </Link>
  )
}, "NewsEdit")

const News = reatomComponent(({ ctx }) => {
  const data = ctx.spy(newsState.item);
  const pageCtx = usePageContext()
  if (!data) return null;

  const currentUser = getDataFromSnapshot("currentUser", pageCtx.snapshot)
  const html = renderToHTMLString({ extensions: editorExtensions, content: data.content as JSONContent })

  const allowEdit = currentUser?.meta.permissions.includes("news.update")

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <div className="flex overflow-hidden rounded-xl">
        <img
          src={data.imageUrl}
          alt=""
          width={1280}
          height={720}
          draggable={false}
          className="object-center object-cover h-80 w-full"
        />
      </div>
      <Typography className="text-3xl font-semibold">
        {data.title}
      </Typography>
      <div className="flex flex-wrap items-center text-nowrap text-sm gap-2 w-fit justify-start
        *:border *:border-neutral-800 *:rounded-lg *:px-2 *:sm:px-4 *:py-1"
      >
        <div className="flex items-center gap-3 w-fit">
          <Typography>
            Создано
          </Typography>
          <Link
            href={createLink("player", data.creator.nickname)}
            className="flex items-center gap-1"
          >
            <Avatar
              url={data.creator.avatar}
              nickname={data.creator.nickname}
              className="h-4 w-4"
            />
            <Typography>
              {data.creator.nickname}
            </Typography>
          </Link>
        </div>
        <div
          title={dayjs(data.created_at).format("DD.MM.YYYY")}
          className="flex items-center"
        >
          <Typography className="text-neutral-50 text-sm leading-4">
            {dayjs(data.created_at).format('D MMM YYYY')}
          </Typography>
        </div>
        <div className="flex items-center gap-1">
          <Typography className="text-neutral-50 text-sm leading-4">
            {data.views}
          </Typography>
          <IconEye size={16} className="text-neutral-400" />
        </div>
        {allowEdit && <NewsEdit id={data.id} />}
      </div>
      <div
        dangerouslySetInnerHTML={{ __html: html }}
        className="tiptap p-0! whitespace-pre-wrap"
      />
    </div>
  )
}, "News")

export default function Page() {
  return <News />
}
