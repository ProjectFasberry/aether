import { cart } from "@/shared/components/app/shop/models/store-cart.model";
import { logRouting } from "@/shared/lib/log";
import { wrapTitle } from "@/shared/lib/utils";
import { useConfig } from "vike-react/useConfig";
import { type PageContextServer } from "vike/types";

function metadata() {
  return {
    title: wrapTitle("Корзина")
  }
}

export async function data(pageCtx: PageContextServer) {
  logRouting(pageCtx.urlPathname, "data")

  const config = useConfig()
  config(metadata())

  await cart.init(pageCtx)
}