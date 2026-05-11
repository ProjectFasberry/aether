import { type PageContextServer } from "vike/types";
import { useConfig } from 'vike-react/useConfig'
import { wrapTitle } from "@/shared/lib/wrap-title";
import { logRouting } from "@/shared/lib/log";
import { getStaticImage } from "@/shared/lib/volume-helpers";

const title = wrapTitle("Территории");
const previewImage = getStaticImage("arts/clan-preview.jpg");

function metadata() {
  return {
    title,
    description: "Территории сервера",
    image: previewImage
  }
}

export const data = async (pageCtx: PageContextServer) => {
  logRouting(pageCtx.urlPathname, data.name);
  
  const config = useConfig()
  config(metadata())
}