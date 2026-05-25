import { useConfig } from 'vike-react/useConfig';
import { PageContextServer } from 'vike/types';
import { wrapTitle } from '@/shared/lib/wrap-title';
import { getStaticObject } from '@/shared/lib/volume';
import { getUrl } from '@/shared/lib/helpers';

const bgImage = getStaticObject("background", "rules_background.png")

const description = "Присоединяйтесь к сообществу Fasberry и помогайте нам развиваться! Ваша поддержка имеет значение."

export const data = async (pageContext: PageContextServer) => {
  const config = useConfig()

  const title = wrapTitle(`Начать играть`);

  config({
    title,
    description,
    Head: (
      <>
        <link rel="canonical" href={getUrl(pageContext)} />
        <meta property="og:url" content={getUrl(pageContext)} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content={title} />
        <meta property="og:image" content={bgImage} />
        <meta property="og:image:type" content="image/jpeg" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content={bgImage} />
        <meta property="twitter:image:type" content="image/jpeg" />
        <meta property="twitter:image:width" content="1200" />
        <meta property="twitter:image:height" content="630" />
      </>
    )
  })
}