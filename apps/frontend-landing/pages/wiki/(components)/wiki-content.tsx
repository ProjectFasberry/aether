import { Typography } from "@repo/ui/typography";
import { Skeleton } from "@repo/ui/skeleton";
import { renderToHTMLString } from "@tiptap/static-renderer";
import { editorExtensions } from "@/shared/components/config/editor";
import { isDevelopment } from "@/shared/env";
import { useData } from "vike-react/useData";
import { Data } from "@/pages/wiki/@category/+data";

export const WikiContentItemSkeleton = () => {
  return (
    <div className="flex flex-col min-h-dvh w-full gap-2 p-4">
      <Skeleton className="h-8 w-2/3 mb-6" />
      <div className="flex flex-col gap-1 mb-4">
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-11/12" />
        <Skeleton className="h-6 w-10/12" />
      </div>
      <div className="flex flex-col gap-1 mb-4">
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-9/12" />
        <Skeleton className="h-6 w-7/12" />
      </div>
      <Skeleton className="h-7 w-1/3 mb-3" />
      <div className="flex flex-col gap-1">
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-10/12" />
        <Skeleton className="h-6 w-9/12" />
        <Skeleton className="h-6 w-8/12" />
      </div>
      <div className="flex flex-col gap-1">
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-11/12" />
        <Skeleton className="h-6 w-9/12" />
        <Skeleton className="h-6 w-10/12" />
        <Skeleton className="h-6 w-8/12" />
      </div>
      <div className="flex flex-col gap-1 mb-4">
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-9/12" />
        <Skeleton className="h-6 w-7/12" />
      </div>
      <Skeleton className="h-7 w-1/3 mb-3" />
      <div className="flex flex-col gap-1">
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-10/12" />
        <Skeleton className="h-6 w-9/12" />
        <Skeleton className="h-6 w-8/12" />
      </div>
      <div className="flex flex-col gap-1">
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-11/12" />
        <Skeleton className="h-6 w-9/12" />
        <Skeleton className="h-6 w-10/12" />
        <Skeleton className="h-6 w-8/12" />
      </div>
    </div>
  )
}

export const WikiContentItem = () => {
  const { data } = useData<Data>()

  if (!data) return (
    <div className="flex items-center justify-center w-full h-[60vh]">
      <Typography>
        Ничего не нашлось
      </Typography>
    </div>
  )

  let html = renderToHTMLString({
    extensions: editorExtensions,
    content: data.content
  })

  if (isDevelopment) {
    html = html.replaceAll("https://volume.fasberry.fun", "http://127.0.0.1:9000")
  }

  return (
    <div
      dangerouslySetInnerHTML={{ __html: html }}
      className="tiptap whitespace-pre-wrap"
    />
  )
}