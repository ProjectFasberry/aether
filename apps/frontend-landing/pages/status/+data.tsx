import { useConfig } from 'vike-react/useConfig';
import { PageContextServer } from 'vike/types';
import { wrapTitle } from '@/shared/lib/wrap-title';
import { getUrl } from '@/shared/lib/helpers';

export const data = async (pageContext: PageContextServer) => {
  const config = useConfig()

  const title = wrapTitle(`Статус сервера`);
  
  config({
    title,
    Head: (
      <>
        <link rel="canonical" href={getUrl(pageContext)} />
        <meta property="og:url" content={getUrl(pageContext)} />
        <meta property="og:title" content={title} />
        <meta property="og:site_name" content={title} />
        <meta name="twitter:title" content={title} />
      </>
    )
  })
}