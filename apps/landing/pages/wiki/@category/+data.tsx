import { useConfig } from 'vike-react/useConfig';
import { PageContextServer } from 'vike/types';
import { wrapTitle } from '@/shared/lib/wrap-title';
import { Wiki } from '@/pages/wiki/(components)/wiki.model';
import { client } from '@/shared/api/client';
import { getUrl } from '@/shared/lib/helpers';
import { renderToMarkdown } from '@tiptap/static-renderer/pm/markdown'
import { editorExtensions } from '@/shared/components/config/editor';

export type Data = Awaited<ReturnType<typeof data>>

async function getData(param: string, init: RequestInit) {
  const res = await client(`shared/wiki/category/${param}`, { ...init })
  const data = await res.json<{ data: Wiki } | { error: string }>()

  if ("error" in data) throw new Error(data.error)
  return data.data
}

export const data = async (pageContext: PageContextServer) => {
  const config = useConfig()
  const headers = pageContext.headers ?? undefined;
  const param = pageContext.routeParams.category;

  const categoryResult = await getData(param, { headers })

  const title = wrapTitle(`${categoryResult.title}`)
  const description = renderToMarkdown({ extensions: editorExtensions, content: categoryResult.content }).slice(0, 128) + '...'

  config({
    title,
    Head: (
      <>
        <link rel="canonical" href={getUrl(pageContext)} />
        <meta property="og:url" content={getUrl(pageContext)} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content={title} />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
      </>
    )
  })

  return {
    data: categoryResult
  }
}