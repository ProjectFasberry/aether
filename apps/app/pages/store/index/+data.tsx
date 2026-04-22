import { cart } from "@/shared/components/app/shop/models/store-cart.model";
import { storeItems } from "@/shared/components/app/shop/models/store.model";
import { APP_URL } from "@/shared/env";
import { isBotRequest } from "@/shared/lib/bot-guard";
import { logRouting } from "@/shared/lib/log";
import { getStaticImage } from "@/shared/lib/volume-helpers";
import { wrapTitle } from "@/shared/lib/wrap-title";
import { APP_OPTIONS_KEY, AppOptionsPayloadExtend } from "@/shared/models/app.model";
import { useConfig } from "vike-react/useConfig";
import { PageContextServer } from "vike/types";

const storePreviewImage = getStaticImage("backgrounds/main_background.png")

function metadata() {
  const title = wrapTitle("Магазин");
  const description = `Поддержите наш сервер Fasberry, 
    приобретая привилегии, уникальные товары и игровые монеты. Улучшите свой игровой опыт и помогите развитию проекта!`;

  return {
    title,
    image: storePreviewImage,
    description,
    Head: (
      <>
        <meta name="robots" content="index, follow, noarchive" />
        <meta name="googlebot" content="index, follow, noimageindex, max-video-preview:-1, max-image-preview:large, max-snippet:-1" />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={`${APP_URL}/store`} />
        <meta property="og:image" content={storePreviewImage} />
        <meta property="og:image:type" content="image/jpeg" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content={storePreviewImage} />
        <meta property="twitter:image:type" content="image/jpeg" />
        <meta property="twitter:image:width" content="1200" />
        <meta property="twitter:image:height" content="630" />
      </>
    )
  }
}

function assertDefined<T>(val: T, name: string): asserts val is NonNullable<T> {
  if (val === undefined || val === null) {
    const message = `${name} is undefined or null`;
    console.warn(message);
  }
}

export const data = async (pageCtx: PageContextServer) => {
  logRouting(pageCtx.urlPathname, "data")

  const headers = pageCtx.headers ?? undefined;
  if (!headers) return;

  const config = useConfig()
  config(metadata())

  if (isBotRequest(headers, pageCtx.urlPathname)) {
    return;
  }

  async function cartInitWrap() {
    const opts = pageCtx.snapshot[APP_OPTIONS_KEY]["data"] as AppOptionsPayloadExtend
    const isAuthed = opts["isAuth"] as Maybe<boolean>
    assertDefined(isAuthed, "isAuthed")

    if (!isAuthed) {
      if (import.meta.env.DEV) {
        console.log("Skipping fetch cart list")
      }
      return;
    }

    return cart.init(pageCtx)
  }

  await Promise.all([
    storeItems.init(pageCtx),
    cartInitWrap()
  ])
}