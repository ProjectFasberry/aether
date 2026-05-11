import { cart } from "@/shared/components/app/shop/models/store-cart.model";
import { logRouting } from "@/shared/lib/log";
import { wrapTitle } from "@/shared/lib/wrap-title";
import { useConfig } from "vike-react/useConfig";
import { type PageContextServer } from "vike/types";

function metadata() {
  return {
    title: wrapTitle("Корзина")
  }
}

export const data = async (pageCtx: PageContextServer) => {
  logRouting(pageCtx.urlPathname, data.name)

  const config = useConfig()
  config(metadata())

  await cart.init(pageCtx)
}