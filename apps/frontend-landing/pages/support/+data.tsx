import { useConfig } from 'vike-solid/useConfig';
import { PageContextServer } from 'vike/types';
import { getStaticObject, getUrl, wrapTitle } from '@/shared/lib/helpers';

const bgImage = getStaticObject("community", "dragon_dead.webp")

const description = `Помогите развитию проекта Fasberry, поддержав нас! Ваш вклад пойдет на развитие серверов,
улучшение игрового опыта и создание уникального контента для игроков.`

export async function data(pageCtx: PageContextServer) {
  const config = useConfig()
  const title = wrapTitle(`Поддержка`);

  config({
    title,
    description,
    Head: (
      <>
        <link rel="canonical" href={getUrl(pageCtx)} />
        <meta property="og:url" content={getUrl(pageCtx)} />
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
