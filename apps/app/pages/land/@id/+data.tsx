import dayjs from "@/shared/lib/create-dayjs"
import { wrapTitle } from "@/shared/lib/wrap-title";
import { useConfig } from "vike-react/useConfig";
import { render } from "vike/abort";
import { PageContextServer } from "vike/types";
import { getStaticImage } from "@/shared/lib/volume-helpers";
import { logRouting } from "@/shared/lib/log";
import { client } from "@/shared/lib/client-wrapper";
import { landAtom } from "@/shared/components/app/land/models/land.model";
import { createCtx } from "@reatom/framework";
import { mergeSnapshot } from "@/shared/lib/snapshot";

const previewImage = getStaticImage("arts/adventure-in-blossom.jpg")

export type Land = ExtractApiData<"getServerLandsByUlid">["data"]
export type Data = Awaited<ReturnType<typeof data>>;

function metadata(
  land: Land,
  pageCtx: PageContextServer
) {
  const title = wrapTitle(land.name.slice(0, 64))
  const created_at = dayjs(land.created_at.toString()).format("DD MMM YYYY");
  const description = `Территория ${land.name}. Создана ${created_at}. ${land.members.length} участников`
  const keywords = `${land.name}, fasberry, fasberry page, территория ${land.name}, land, fasberry land, fasberry ${land.name}`

  return {
    title,
    description,
    image: previewImage,
    Head: (
      <>
        <meta property="og:url" content={pageCtx.urlPathname} />
        <meta property="og:type" content="website" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        <meta name="keywords" content={keywords} />
      </>
    ),
  }
}

async function loadLand(ulid: string, headers?: Record<string, string>): Promise<Land | null> {
  try {
    const land = await client<Land>(`server/lands/${ulid}`, { headers }).exec()
    return land
  } catch (e) {
    return null;
  }
}

export async function data(pageCtx: PageContextServer) {
  logRouting(pageCtx.urlPathname, "data");

  const config = useConfig()
  const headers = pageCtx.headers ?? undefined
  const ulid = pageCtx.routeParams.id;

  const land = await loadLand(ulid, headers)
  if (!land) throw render("/not-exist?type=land")

  config(metadata(land, pageCtx))

  const ctx = createCtx()
  landAtom(ctx, land)
  pageCtx.snapshot = mergeSnapshot(ctx, pageCtx)
}