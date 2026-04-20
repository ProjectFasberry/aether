import { PageContextServer } from "vike/types";
import { useConfig } from 'vike-react/useConfig'
import { wrapTitle } from "@/shared/lib/wrap-title";
import { render } from "vike/abort";
import { StoreItem } from "@repo/shared/types/entities/store";
import { defineCartData } from "@/shared/components/app/shop/models/store-cart.model";
import { logRouting } from "@/shared/lib/log";
import { getStoreItem } from "@/shared/components/app/shop/models/store-item.model";
import { createCtx } from "@reatom/core";
import { selectedItemAtom } from "./+Page";
import { mergeSnapshot } from "@/shared/lib/snapshot";

function metadata(
  item: StoreItem,
  pageContext: PageContextServer
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
        <meta property="og:url" content={pageContext.urlPathname} />
        <meta property="og:type" content="website" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        <link rel="preload" as="image" href={image} imageSrcSet="" imageSizes="" />
        <meta name="keywords" content={keywords} />
      </>
    ),
  }
}

async function loadItem(id: string, headers?: Record<string, string>): Promise<StoreItem | null> {
  try {
    const item = await getStoreItem(id, { headers })
    return item
  } catch (e) {
    return null;
  }
}

export async function data(pageCtx: PageContextServer) {
  logRouting(pageCtx.urlPathname, "data")

  const config = useConfig()
  const headers = pageCtx.headers ?? undefined
  const id = pageCtx.routeParams.id;

  const item = await loadItem(id, headers)
  if (!item) throw render("/not-exist?type=store-item")

  config(metadata(item, pageCtx))

  await defineCartData(pageCtx)

  const ctx = createCtx()
  selectedItemAtom(ctx, item)
  pageCtx.snapshot = mergeSnapshot(ctx, pageCtx)
}