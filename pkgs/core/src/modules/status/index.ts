import type { DB } from "@gen/db/general";
import { t } from "elysia";
import type Redis from "ioredis";
import type { Selectable } from "kysely";
import { safeJsonParse } from "@repo/shared/utils";
import { getStaticUrl } from "../../utils/url";
import { buildRedisKey } from "../../utils/redis";
import { getAuthHeaderWithBtoa } from "../../utils";
import type { Kysely } from "kysely";
import { getPanelClient } from "../../lib/api/panel";

export const serverSchema = t.Object({
  online: t.Number(),
  fullname: t.String(),
  thumbnail: t.String(),
  max: t.Number(),
  players: t.Array(t.String()),
  status: t.String(),
  available: t.Boolean(),
  description: t.Optional(t.Nullable(t.String())),
});

export const statusSchema = t.Object({
  proxy: t.Object({
    status: t.String(),
    online: t.Number(),
    max: t.Number(),
    players: t.Array(t.String()),
  }),
  servers: t.Record(t.String(), serverSchema),
});

export const statusQuerySchema = t.Object({
  q: t.Optional(
    t.Union([t.Literal("excluded"), t.Literal("all")], { default: "all" })
  ),
});

export type StatusPayload = (typeof statusSchema)["static"];
export type StatusQuery = (typeof statusQuerySchema)["static"];

type Player = {
  username: string;
  uuid: string;
  currentServer: string;
};

const INITIAL_PROXY_DATA: StatusPayload["proxy"] = {
  status: "offline", online: 0, max: 200, players: [],
};

const SERVER_STATUS_KEY = buildRedisKey({
  name: "server-status:data",
  target: "internal",
});

type WithPanelCredentials = { panelUser: string; panelPassword: string };

type CreateServerStatus = {
  config: { VOLUME_URL: string },
  generalDb: Kysely<DB>
}

type SharedParams = {
  redis: () => Redis
}

export const createServerStatusService = ({
  config, generalDb
}: CreateServerStatus) => {
  return {
    async getPlayerStatusGlobal({
      nickname, panelUser, panelPassword
    }: { nickname: string } & WithPanelCredentials) {
      type PlayerPayload = Player & {
        ping: number;
        sessionDurationSeconds: number;
      };

      const result = await getPanelClient({ generalDb })
        .get(`player/${nickname}`, {
          headers: getAuthHeaderWithBtoa(panelUser, panelPassword),
          timeout: 1000,
          retry: 1
        })
        .json<PlayerPayload>()
        .catch(() => null);

      return result;
    },
    async _getProxyStats({
      panelUser, panelPassword
    }: WithPanelCredentials) {
      async function getTarget<T>(path: string, fallback: T): Promise<T> {
        return getPanelClient({ generalDb })
          .get(path, {
            headers: getAuthHeaderWithBtoa(panelUser, panelPassword)
          })
          .then((res) => res.json() as Promise<T>)
          .then((data) => data ?? fallback)
          .catch(() => fallback);
      }

      const [online, servers, status, playersList] = await Promise.all([
        getTarget<{ count: number }>("count", { count: 0 }),
        getTarget<{ [key: string]: number }>("servers", {}),
        getTarget<{ status: string }>("health", { status: "offline" }),
        getTarget<{ count: number; players: Player[] }>("playerlist", { count: 0, players: [] }),
      ]);

      const result = {
        servers,
        playersList,
        online: online.count,
        status: status.status,
      };

      return result;
    },
    async _getRawData({
      panelUser, panelPassword
    }: WithPanelCredentials) {
      try {
        const [proxyStats, serversStats] = await Promise.all([
          this._getProxyStats({ panelUser, panelPassword }),
          generalDb.selectFrom("servers").selectAll().execute(),
        ]);

        if (proxyStats.status !== "ok") {
          return { proxy: INITIAL_PROXY_DATA, servers: {} };
        }

        function mapServerData(
          server: string, online: number, allPlayers: Player[], servers: Selectable<DB["servers"]>[],
        ) {
          const rawData = servers.find((d) => d.origin === server.toLowerCase());

          const result = [
            server.toLowerCase(),
            {
              online,
              players: allPlayers.filter((p) => p.currentServer === server).map((p) => p.username),
              fullname: rawData?.fullname ?? "unknown",
              thumbnail: getStaticUrl(rawData?.thumbnail ?? "", config.VOLUME_URL),
              status: "online",
              max: 200,
              description: rawData?.description,
              available: rawData?.available ?? true,
              excluded: rawData?.excluded ?? false,
            },
          ] as const;

          return result
        }

        const serverEntries = Object.entries(proxyStats.servers).map(([server, online]) =>
          mapServerData(server, online, proxyStats.playersList.players, serversStats),
        );

        return {
          proxy: {
            status: "online",
            online: proxyStats.playersList.count,
            max: 200,
            players: proxyStats.playersList.players.map((d) => d.username),
          },
          servers: Object.fromEntries(serverEntries),
        };
      } catch (e) {
        console.error("Failed to update server status", e);
        return null;
      }
    },
    async updateServerStatus({
      redis, panelUser, panelPassword
    }: WithPanelCredentials & Pick<SharedParams, "redis">) {
      const data = await this._getRawData({
        panelUser, panelPassword
      });

      await redis().set(SERVER_STATUS_KEY, JSON.stringify(data));
    },
    async getData({
      query, redis
    }: {
      query?: StatusQuery,
      redis: SharedParams["redis"]
    }) {
      const dataStr = await redis().get(SERVER_STATUS_KEY);
      if (!dataStr) return null;

      const result = safeJsonParse<StatusPayload>(dataStr);
      if (!result.ok) return null;

      const data = result.value;

      if (query?.q === "excluded") {
        return {
          ...data,
          servers: Object.fromEntries(
            // @ts-expect-error
            Object.entries(data.servers).filter(([_, s]) => !s.excluded),
          ),
        };
      }

      return data;
    }
  }
}
