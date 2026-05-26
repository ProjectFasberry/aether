import { getUrl, wrapTitle } from '@/shared/lib/helpers';
import { useConfig } from 'vike-solid/useConfig';
import { PageContextServer } from 'vike/types';

export async function data(pageCtx: PageContextServer) {
  const config = useConfig()

  const title = wrapTitle("Галерея");

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
