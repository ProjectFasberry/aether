import { PageContextServer } from "vike/types";
import { useConfig } from 'vike-react/useConfig'
import { wrapTitle } from "@/shared/lib/wrap-title";
import { render } from "vike/abort";
import { StoreItem } from "@repo/shared/types/entities/store";
import { cart } from "@/shared/components/app/shop/models/store-cart.model";
import { logRouting } from "@/shared/lib/log";
import { getStoreItem, storeItemState } from "@/shared/components/app/shop/models/store-item.model";
import { createCtx } from "@reatom/core";
import { mergeSnapshot } from "@/shared/lib/snapshot";

function metadata(
  item: StoreItem,
  pageCtx: PageContextServer
) {
  const title = wrapTitle(item.title).slice(0, 64)
  const description = item.description ?? "";
  const image = item.imageUrl
  const keywords = `${item.title}, fasberry, fasberry page, товар, магазин, store`

  return {
    title,
    description,
    image,
    Head: (
      <>
        <meta property="og:url" content={pageCtx.urlPathname} />
        <meta property="og:type" content="website" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        <link rel="preload" as="image" href={image} imageSrcSet="" imageSizes="" />
        <meta name="keywords" content={keywords} />
      </>
    ),
  }
}

export async function data(pageCtx: PageContextServer) {
  logRouting(pageCtx.urlPathname, "data")

  const config = useConfig()
  const headers = pageCtx.headers ?? undefined
  const id = pageCtx.routeParams.id;

  const data = await getStoreItem(id, { headers }).catch((e) => {
    console.error(e)
    return null;
  })
  
  if (!data) throw render("/not-exist?type=store-item")

  config(metadata(data, pageCtx))

  await cart.init(pageCtx)

  const ctx = createCtx()
  storeItemState.data(ctx, data)
  pageCtx.snapshot = mergeSnapshot(ctx, pageCtx)
}