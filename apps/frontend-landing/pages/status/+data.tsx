import { useConfig } from 'vike-solid/useConfig';
import { PageContextServer } from 'vike/types';
import { getUrl, wrapTitle } from '@/shared/lib/helpers';

export async function data(pageCtx: PageContextServer) {
  const config = useConfig()

  const title = wrapTitle(`Статус сервера`);

  config({
    title,
    Head: (
      <>
        <link rel="canonical" href={getUrl(pageCtx)} />
        <meta property="og:url" content={getUrl(pageCtx)} />
        <meta property="og:title" content={title} />
        <meta property="og:site_name" content={title} />
        <meta name="twitter:title" content={title} />
      </>
    )
  })
}
