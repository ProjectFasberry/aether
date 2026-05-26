import { useConfig } from 'vike-solid/useConfig';
import type { PageContextServer } from 'vike/types';
import { Wiki } from '@/pages/wiki/(components)/wiki.model';
import { client } from '@/shared/api/client';
import { getUrl, wrapTitle } from '@/shared/lib/helpers';
import { renderToMarkdown } from '@tiptap/static-renderer/pm/markdown'
import { editorExtensions as extensions } from '@/shared/components/config/editor';
import { wrapClient } from '@/shared/lib/api';

export type Data = Awaited<ReturnType<typeof data>>

export async function data(pageCtx: PageContextServer) {
  const config = useConfig();

  const categoryResult = await wrapClient<Wiki | null>(
    () => client(`shared/wiki/category/${pageCtx.routeParams.category}`, { headers: pageCtx.headers ?? undefined })
  )

  if (!categoryResult) {
    const title = "Статья не найдена";

    config({
      title,
      Head: (
        <>
          <link rel="canonical" href={getUrl(pageCtx)} />
          <meta property="og:url" content={getUrl(pageCtx)} />
          <meta property="og:title" content={title} />
          <meta property="og:type" content="website" />
          <meta property="og:site_name" content={title} />
          <meta name="twitter:title" content={title} />
        </>
      )
    })
    return {
      data: null
    };
  }

  const title = wrapTitle(`${categoryResult.title}`);
  const markdown = renderToMarkdown({ extensions, content: categoryResult.content })
  const description = markdown.slice(0, 128) + '...'

  config({
    title,
    Head: (
      <>
        <link rel="canonical" href={getUrl(pageCtx)} />
        <meta property="og:url" content={getUrl(pageCtx)} />
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
