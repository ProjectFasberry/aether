import { PageContextServer } from "vike/types";
import { useConfig } from 'vike-react/useConfig'
import { wrapTitle } from "@/shared/lib/wrap-title";
import { getStaticImage } from "@/shared/lib/volume-helpers";
import { logRouting } from "@/shared/lib/log";
import { PLAY_IP } from "@/shared/env";
import { getNews, newsState } from "@/shared/components/app/news/models/news.model";
import { createCtx } from "@reatom/core";
import { mergeSnapshot } from "@/shared/lib/snapshot";
import { eventsState, getEvents } from "@/shared/components/app/events/models/events.model";

const previewImage = getStaticImage("arts/8332de192322939.webp")

const title = wrapTitle("Главная")
const description = `Официальное приложение майнкрафт-проекта Fasberry. Жанр: RP, RPG, полу-ванила. 1.20.1+. Играть: ${PLAY_IP}.`

function metadata(pageContext: PageContextServer) {
  return {
    title,
    image: previewImage,
    description,
    Head: (
      <>
        <meta property="og:url" content={pageContext.urlPathname} />
        <meta property="og:type" content="website" />
        <meta name="robots" content="index, follow, noarchive" />
        <meta name="googlebot" content="index, follow, noimageindex, max-video-preview:-1, max-image-preview:large, max-snippet:-1" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
      </>
    ),
  }
}

export async function data(pageCtx: PageContextServer) {
  logRouting(pageCtx.urlPathname, "data");

  const headers = pageCtx.headers ?? undefined;

  const config = useConfig()
  config(metadata(pageCtx))

  const ctx = createCtx()
  const news = await getNews({ limit: 3, asc: false }, { headers })
  const events = await getEvents({ limit: 3 }, { headers });

  newsState.data(ctx, news.data)
  eventsState.data(ctx, events)
  pageCtx.snapshot = mergeSnapshot(ctx, pageCtx)
}