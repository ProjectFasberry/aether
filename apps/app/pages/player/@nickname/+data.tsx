import { PageContextServer } from "vike/types";
import type { Player } from "@repo/shared/types/entities/user"
import { redirect } from "vike/abort";
import { useConfig } from "vike-react/useConfig";
import { wrapTitle } from "@/shared/lib/wrap-title";
import { DONATE_TITLE } from "@repo/shared/constants/donate-aliases";
import { logRouting } from "@/shared/lib/log";
import { createCtx, Ctx } from "@reatom/core";
import { getLands, playerLandsState } from "@/shared/components/app/player/models/player-lands.model";
import { getPlayer, playerAtom } from "@/shared/components/app/player/models/player.model";
import { mergeSnapshot } from "@/shared/lib/snapshot";
import dayjs from "@/shared/lib/create-dayjs"
import { PlayerLandsPayload } from "@repo/shared/types/entities/land";
import { isEmptyArray } from "@/shared/lib/array";
import { playerRateState } from "@/shared/components/app/player/models/rate.model";

export type Data = Awaited<ReturnType<typeof data>>;

async function loadPlayer(nickname: string, headers?: Record<string, string>): Promise<Player | null> {
  try {
    const player = await getPlayer(nickname, { headers });
    return player;
  } catch (e) {
    return null;
  }
}

async function loadLands(nickname: string, headers?: Record<string, string>) {
  try {
    const lands = await getLands(nickname, { headers });
    return isEmptyArray(lands?.data) ? null : lands;
  } catch {
    return null;
  }
}

function buildMetadataValues(user: Player, pageCtx: PageContextServer) {
  const nickname = user.nickname;
  const reg = dayjs(user.meta.reg_date).format("DD MMM YYYY");
  const login = dayjs(user.meta.login_date).format("DD MMM YYYY");

  return {
    title: wrapTitle(nickname),
    image: user.avatar ?? "",
    description: `Профиль игрока ${nickname}. Привилегия: ${DONATE_TITLE[user.group]}. Играет с ${reg}. Последний вход: ${login}.`,
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

async function fillSnapshot(ctx: Ctx, player: Player, lands: PlayerLandsPayload | null) {
  const { rate, ...base } = player;

  playerAtom(ctx, base);
  playerRateState.data(ctx, rate);
  playerLandsState.data(ctx, lands);
}

export async function data(pageCtx: PageContextServer) {
  logRouting(pageCtx.urlPathname, "data");

  const config = useConfig();
  const headers = pageCtx.headers ?? undefined
  const nickname = pageCtx.routeParams.nickname;

  const player = await loadPlayer(nickname, headers);
  if (!player) throw redirect("/not-exist?type=player");

  const lands = await loadLands(nickname, headers);

  const metaValues = buildMetadataValues(player, pageCtx);
  config({
    title: metaValues.title,
    image: metaValues.image,
    description: metaValues.description,
    Head: buildMetadataHead(metaValues)
  });

  const ctx = createCtx()
  await fillSnapshot(ctx, player, lands);

  pageCtx.snapshot = mergeSnapshot(ctx, pageCtx)
}