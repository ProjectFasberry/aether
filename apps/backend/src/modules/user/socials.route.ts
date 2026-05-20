import Elysia, { t } from "elysia";
import { general } from "#/shared/database/general-db";
import type { JsonValue } from "@repo/shared/types/db/general-database-types";
import { defineOptionalUser, defineRequiredUser } from "#/lib/define";
import { getRedis } from "#/shared/redis/client";
import { getRedisKey } from "#/helpers/redis";
import { nanoid } from "nanoid";
import { withData, withError } from "#/shared/schemas";
import { wrapError } from "@repo/shared/lib/utils";

type PlayerSocialsValuePayload = {
  id: string | number;
  username: string;
};

export type PlayerSocialsPayload = {
  type: "telegram" | "discord";
  value: PlayerSocialsValuePayload;
};

type Initial = {
  id: number;
  created_at: Date;
  social: "telegram" | "discord";
  value: JsonValue;
};

const playerSocialsAvailable = new Elysia()
  .use(defineRequiredUser())
  .get("/available", async ({ nickname }) => {
    const query = await general
      .selectFrom("players_socials")
      .select(["social"])
      .where("nickname", "=", nickname)
      .execute();

    const all = [
      { title: "Telegram", social: "telegram" },
      { title: "Discord", social: "discord" },
    ];

    if (!query.length) {
      return { data: all }
    }

    const data = query
      .map((i) =>
        all.map((t) => t.social).includes(i.social) &&
        all.find((t) => t.social !== i.social)
      )
      .filter(Boolean);

    return { data };
  }, {
    response: {
      200: withData(
        t.Array(
          t.Object({
            title: t.String(),
            social: t.String()
          })
        )
      )
    }
  });

const playerSocialsAddEvents = new Elysia().get("/add/events", async (ctx) => {
  // const existsRequest = safeJsonParse<unknown>(existsRequestStr)
});

const getSocialsAddCacheKey = (nickname: string, social: string) =>
  getRedisKey("internal", `socials:${nickname}:${social}:connect`);

const playerSocialsAddList = new Elysia()
  .use(defineRequiredUser())
  .get("/add/list", async ({ nickname }) => {
    const redis = getRedis();

    const data: { social: string; code: string }[] = [];

    return { data };
  });

const playerSocialsAdd = new Elysia()
  .use(defineRequiredUser())
  .post("/add", async ({ status, nickname, body: { social } }) => {
    const socialIsExist = await general
      .selectFrom("players_socials_available")
      .select("value")
      .where("value", "=", social)
      .executeTakeFirst();

    if (!socialIsExist || !socialIsExist.value) {
      throw status(400, wrapError("SOCIAL_NOT_FOUND"));
    }

    const query = await general
      .selectFrom("players_socials")
      .select("social")
      .where("social", "=", social)
      .where("nickname", "=", nickname)
      .executeTakeFirst();

    if (query && query.social) {
      throw status(400, wrapError("SAVED_SOCIAL_EXISTS"));
    }

    const redis = getRedis();
    const socialRedisKey = getSocialsAddCacheKey(nickname, social);

    const existsRequestStr = await redis.get(socialRedisKey);
    if (existsRequestStr) {
      throw status(400, wrapError("SOCIAL_REQUEST_EXISTS"));
    }

    const code = nanoid(4);

    const reqPayload = {
      created_at: new Date().toISOString(),
      code,
    };

    await redis.set(
      socialRedisKey,
      JSON.stringify(reqPayload), "EX", 5 * 60
    );

    const data = {
      payload: code,
      target: social,
    };

    return { data };
  }, {
    body: t.Object({
      social: t.String({ minLength: 2 }),
    }),
    response: {
      200: withData(
        t.Object({
          payload: t.String(),
          target: t.String()
        })
      ),
      400: withError(
        t.UnionEnum(["SOCIAL_REQUEST_EXISTS", "SAVED_SOCIAL_EXISTS", "SOCIAL_NOT_FOUND"])
      )
    }
  });

const playerSocialsDelete = new Elysia()
  .use(defineRequiredUser())
  .delete("/:social", async ({ status, nickname, params: { social } }) => {
    const query = await general
      .deleteFrom("players_socials")
      .where("social", "=", social)
      .where("nickname", "=", nickname)
      .executeTakeFirstOrThrow();

    if (!query.numDeletedRows) throw status(500, wrapError("NOT_DELETED"))

    return { data: { social } };
  }, {
    params: t.Object({
      social: t.String({ minLength: 2 }),
    }),
    response: {
      200: withData(
        t.Object({
          social: t.String()
        })
      ),
      500: withError(
        t.UnionEnum(["NOT_DELETED"])
      )
    }
  });

const playerSocialsList = new Elysia()
  .use(defineOptionalUser())
  .get("/list/:nickname", async ({ nickname: currentUserNickname, status, params: { nickname }, query: { variant } }) => {
    if (variant === 'private' && nickname !== currentUserNickname) {
      throw status(400, wrapError("NOT_ACCESSIBLE"))
    }

    const query = await general
      .selectFrom("players_socials")
      .select(["id", "created_at", "social", "value"])
      .where("nickname", "=", nickname)
      .$castTo<Initial>()
      .execute();

    // todo: add returning the tg username by id
    const data = query.map((item) => {
      if (!item.value) throw new Error("No value in player socials");

      const base = {
        social: item.social,
        value: item.value.toString(),
        created_at: null
      }

      if (variant === 'private') {
        return {
          ...base,
          created_at: item.created_at.toString(),
        }
      }

      return base
    });

    return { data };
  }, {
    query: t.Object({
      variant: t.UnionEnum(["public", "private"], { default: "public" })
    }),
    response: {
      200: withData(
        t.Array(
          t.Object({
            social: t.String(),
            created_at: t.Nullable(t.String()),
            value: t.String()
          })
        )
      ),
      400: withError(
        t.UnionEnum([
          "NOT_ACCESSIBLE"
        ])
      )
    }
  });

export const playerSocials = new Elysia()
  .group("/socials", (app) => app
    .use(playerSocialsAdd)
    .use(playerSocialsAddList)
    .use(playerSocialsAddEvents)
    .use(playerSocialsDelete)
    .use(playerSocialsAvailable)
    .use(playerSocialsList)
  );
