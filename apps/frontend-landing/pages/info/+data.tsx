import { useConfig } from 'vike-solid/useConfig';
import { PageContextServer } from 'vike/types';
import { getUrl } from '@/shared/lib/helpers';

export const data = async (pageContext: PageContextServer) => {
  const config = useConfig()

  config({
    Head: (
      <>
        <link rel="canonical" href={getUrl(pageContext)} />
        <meta property="og:url" content={getUrl(pageContext)} />
      </>
    )
  })
}
