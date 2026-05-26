import { type PageContextServer } from "vike/types";
import { redirect } from "vike/abort";
import { useConfig } from "vike-react/useConfig";
import { wrapTitle } from "@/shared/lib/utils";
import { logRouting } from "@/shared/lib/log";
import { createCtx } from "@reatom/framework";
import { getLands, playerLandsState } from "@/shared/components/app/player/models/player-lands.model";
import { getPlayer, playerSsrModel, playerState } from "@/shared/components/app/player/models/player.model";
import { snapshots } from "@/shared/models/ssr";
import dayjs from "@/shared/lib/create-dayjs"
import { isEmptyArray } from "@/shared/lib/helpers";
import { DONATE_GROUPS, DONATE_TITLE } from "@/shared/consts";

export type PlayerLandsPayload = ExtractApiData<"getServerLandsListByNickname">["data"]
export type Player = ExtractApiData<"getServerPlayerByNickname">["data"]
export type Data = Awaited<ReturnType<typeof data>>;

function buildMetadataValues(user: Player, pageCtx: PageContextServer) {
  const nickname = user.nickname;
  const reg = dayjs(user.meta.reg_date.toString()).format("DD MMM YYYY");
  const login = dayjs(user.meta.login_date.toString()).format("DD MMM YYYY");

  return {
    title: wrapTitle(nickname),
    image: user.avatar ?? "",
    description: `Профиль игрока ${nickname}. Привилегия: ${DONATE_TITLE[user.group as keyof typeof DONATE_GROUPS]}. Играет с ${reg}. Последний вход: ${login}.`,
    url: pageCtx.urlPathname,
    nickname
  };
}

function buildMetadataHead({ title, nickname, description, image, url }: ReturnType<typeof buildMetadataValues>) {
  const keywords = `${nickname}, fasberry, fasberry page, профиль ${nickname}`

  return (
    <>
      <meta property="og:url" content={url} />
      <meta property="og:type" content="website" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      {image && (
        <>
          <link rel="preload" as="image" href={image} fetchPriority="high" />
        </>
      )}
      <meta name="keywords" content={keywords} />
    </>
  );
}

function definePlayerTags(group: Player["group"]) {
  const tags: Player["group"][] = [];

  if (group !== 'default') {
    tags.push(...[group, "default"])
  } else {
    tags.push(group)
  }
  return tags
}

export async function data(pageCtx: PageContextServer) {
  const config = useConfig();
  const headers = pageCtx.headers
  if (!headers) return;

  logRouting(pageCtx.urlPathname, "data");

  const nickname = pageCtx.routeParams.nickname;

  const player = await getPlayer(nickname, { headers })
    .catch(e => {
      console.error(e)
      return null
    });

  if (!player) throw redirect("/not-exist?type=player");

  const lands = await getLands(nickname, { headers })
    .then(r => isEmptyArray(r?.data) ? null : r)
    .catch(e => {
      console.error(e)
      return null;
    })

  const metaValues = buildMetadataValues(player, pageCtx);
  config({
    title: metaValues.title,
    image: metaValues.image,
    description: metaValues.description,
    Head: buildMetadataHead(metaValues)
  });

  const ctx = createCtx()

  const { rate, ...base } = player;

  playerState.data(ctx, base);
  playerState.tags(ctx, definePlayerTags(base.group))
  playerState.nickname(ctx, base.nickname)
  playerState.rate(ctx, rate);
  playerLandsState.data(ctx, lands);

  pageCtx.snapshot = snapshots.merge(ctx, pageCtx, playerSsrModel.snapshotAtom)
}
