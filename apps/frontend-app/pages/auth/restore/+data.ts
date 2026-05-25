import { logRouting } from "@/shared/lib/log";
import { wrapTitle } from "@/shared/lib/utils";
import { getStaticImage } from "@/shared/lib/volume-helpers";
import { useConfig } from "vike-react/useConfig";
import { type PageContext } from "vike/types";

const title = wrapTitle(`Восстановление доступа к аккаунту`);
const previewImage = getStaticImage("arts/wide.jpg");

function metadata() {
  return {
    title,
    description: "Восстановление доступа к аккаунту",
    previewImage
  }
}

export async function data(pageCtx: PageContext) {
  logRouting(pageCtx.urlPathname, "data");

  const config = useConfig()
  config(metadata())
}
