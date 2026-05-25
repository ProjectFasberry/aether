import { logRouting } from "@/shared/lib/log";
import { getStaticImage } from "@/shared/lib/volume-helpers";
import { useConfig } from "vike-react/useConfig";
import { type PageContextServer } from "vike/types";
import { m } from "@/paraglide/messages.js";

export type Data = Awaited<ReturnType<typeof data>>;

const previewImage = getStaticImage("arts/sand-camel.jpg")

function metadata(title: string) {
  return {
    title,
    image: previewImage
  }
}

const TITLE = {
  "player": "Игрок не найден",
  "land": "Похоже этого региона уже нет",
  "store.item": "Товар не найден",
  "default": "Ресурс не найден"
} as const;

type TitleType = keyof typeof TITLE

export async function data(pageCtx: PageContextServer) {
  logRouting(pageCtx.urlPathname, "data");
  
  const type = pageCtx.urlParsed.search["type"] as TitleType | undefined ?? "default"
  const title = m[`${type}.not-found`]()

  const config = useConfig()
  config(metadata(title));

  return {
    title
  }
}