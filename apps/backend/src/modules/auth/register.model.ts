import { client } from "#/shared/api/client";
import { general } from "#/shared/database/general-db";
import { getNats } from "#/shared/nats/client";
import { SUBJECTS } from "#/shared/nats/subjects";
import dayjs from "dayjs";
import { createEvent } from "../server/events/events.model";
import type { Kysely, Transaction } from "kysely";
import { normalizeIp } from "#/helpers/normalize-ip";
import type { DB } from "@repo/shared/types/db/general-database-types";
import { authLogger } from "./auth.model";
import { logger } from "#/utils/config/logger";
import type * as z from "zod/v4";
import { isProduction } from "#/shared/env";
import { invariant } from "#/helpers/invariant";
import type { registerSchema } from "@repo/shared/schemas/auth";
import { initPlayerSkin } from "../server/skin/skin.model";

type RegisterUser = Omit<CreateUser, "findoutType" | "findout" | "uuid"> & {
  trx?: Transaction<DB>;
};

const registerLogger = authLogger.withTag("Register");

type CreateUser = Omit<z.infer<typeof registerSchema>, "token"> & {
  uuid: string;
  ip: string;
};

const referral = {
  async register({
    referrer, referral, trx,
  }: {
    referrer: string; referral: string; trx: Transaction<DB>;
  }) {
    const isExist = await trx
      .selectFrom("players")
      .select("nickname")
      .where("nickname", "=", referrer)
      .executeTakeFirst();

    if (!isExist?.nickname) {
      logger.withTag("Referals").warn(`Referrer ${referrer} is not defined as player`);
      return;
    }

    const isValidByLimitReferrer = await trx
      .selectFrom("referrals")
      .select("id")
      .where("referrer", "=", referrer)
      .execute();

    if (isValidByLimitReferrer.length >= 4) {
      logger.withTag("Referals").warn(`Referals limit by referrer`);
      return;
    }

    const query = await trx
      .insertInto("referrals")
      .values({
        referrer,
        referral,
      })
      .executeTakeFirstOrThrow();

    logger.withTag("Referals").log(`Registered new referal ${referral} of ${referrer}`);

    return query;
  }
}

const MAX_USERS_PER_IP = 3;
const MOJANG_API_URL = "https://api.ashcon.app/mojang/v2/user";

export const register = {
  async registrationEvents({ nickname }: { nickname: string }) {
    const eventsRec = {
      skin: initPlayerSkin,
    };

    const events = Object.entries(eventsRec);

    const eventsExec = await Promise.all(
      events.map(async ([key, fn]) => {
        const val = await fn(nickname);
        invariant(val, `${key} for ${nickname} error inited`);

        registerLogger.log(`${key} for ${nickname} inited`);

        return { val, key };
      }),
    );

    registerLogger.log(eventsExec, nickname);
  },
  async create(args: RegisterUser): Promise<{ nickname: string; created_at: Date }> {
    const { trx, ip, nickname, password, hash } = args;
    const dbInstance: Kysely<DB> = trx ?? general;

    const uuid = await this.getUserUUID(nickname);
    const regDateMs = Date.now();
    const lowerCaseNickname = nickname.toLowerCase();

    registerLogger.log(`Starting register player ${nickname}`);

    async function registerAUTH(instance: Kysely<DB>) {
      return instance
        .insertInto("AUTH")
        .values({
          NICKNAME: nickname,
          LOWERCASENICKNAME: lowerCaseNickname,
          IP: normalizeIp(ip),
          HASH: password,
          UUID: uuid,
          REGDATE: regDateMs,
        })
        .onConflict((oc) => oc.column("LOWERCASENICKNAME").doNothing())
        .returning(["NICKNAME", "REGDATE"])
        .executeTakeFirstOrThrow();
    }

    async function registerPlayers(instance: Kysely<DB>) {
      return instance
        .insertInto("players")
        .values({
          nickname,
          lower_case_nickname: lowerCaseNickname,
          uuid,
        })
        .returning(["nickname", "created_at"])
        .executeTakeFirstOrThrow();
    }

    try {
      const registerScope = this;

      async function register() {
        if (dbInstance.isTransaction) {
          const [players, _] = await Promise.all([
            registerPlayers(dbInstance),
            registerAUTH(dbInstance)
          ]);

          if (isProduction) {
            await registerScope.registrationEvents({ nickname });
          }

          return players;
        } else {
          const result = await dbInstance
            .transaction()
            .execute(async (trx) => {
              const [players, _] = await Promise.all([
                registerPlayers(dbInstance),
                registerAUTH(dbInstance)
              ]);

              return players;
            });

          if (isProduction) {
            await registerScope.registrationEvents({ nickname });
          }

          return result;
        }
      }

      const result = await register();

      const formattedDate = dayjs(result.created_at).format("DD.HH.MM hh:mm:ss");
      registerLogger.log(`Player ${nickname} in ${formattedDate}`);

      if (isProduction) {
        this.afterRegistrationEvents({ nickname });
      }

      return result;
    } catch (e) {
      throw e;
    }
  },
  async createUser(args: Omit<CreateUser, "uuid">): Promise<{ nickname: string }> {
    const { nickname, findout, password, ip, findoutType, hash } = args;

    const result = await general
      .transaction()
      .execute(async (trx) => {
        const registeredUser = await this.create({
          trx, hash, nickname, password, ip
        });

        if (findoutType === "referrer") {
          const referrerNickname = findout;
          const referralNickname = nickname;

          const result = await referral.register({
            trx, referral: referralNickname, referrer: referrerNickname
          });

          console.log(result)
        } else if (findoutType === "custom") {
          const val = await trx
            .insertInto("findout")
            .values({ nickname, value: findout })
            .executeTakeFirstOrThrow();

          console.log(val)
        }

        return registeredUser;
      });

    return result;
  },
  afterRegistrationEvents({ nickname }: { nickname: string }) {
    createEvent({
      description: `Игрок ${nickname} был зарегистрирован`,
      type: "log",
      initiator: "system",
      title: "Регистрация",
    });

    const nc = getNats();

    nc.publish(
      SUBJECTS.EVENTS.AUTHORIZATION.REGISTER,
      JSON.stringify({
        created_at: dayjs().toDate(),
        nickname,
      }),
    );
  },
  generateOfflineUUID(nickname: string): string {
    const offlineIdentifier = `OfflinePlayer:${nickname}`;

    const hashBuff = new Bun.CryptoHasher("md5").update(offlineIdentifier).digest();
    const hashArr = new Uint8Array(hashBuff);

    hashArr[6] = (hashArr[6] & 0x0f) | 0x30;
    hashArr[8] = (hashArr[8] & 0x3f) | 0x80;

    const uuid = Array.from(hashArr)
      .map((byte) => ("00" + byte.toString(16)).slice(-2))
      .join("");

    const raw = [
      uuid.slice(0, 8),
      uuid.slice(8, 12),
      uuid.slice(12, 16),
      uuid.slice(16, 20),
      uuid.slice(20)
    ];

    return raw.join("-");
  },
  async getUserUUID(nickname: string) {
    let uuid: string | null = null;
    let type: "offline" | "license" = "license";

    try {
      const license = await this.getLicense(nickname);

      if ("error" in license) {
        type = "offline";
        throw new Error(license.reason);
      }

      if (license.uuid) {
        uuid = license.uuid;
      }
    } catch (e) {
      // generate offline uuid if user is not licensed
      uuid = this.generateOfflineUUID(nickname);
    }

    authLogger.log(`Player ${nickname} has a ${type} account`);
    invariant(uuid, "UUID must be required");

    return uuid;
  },
  async validateIpRestricts(ip: string): Promise<boolean> {
    const result = await general
      .selectFrom("AUTH")
      .select("NICKNAME")
      .where("IP", "=", ip)
      .execute();

    if (!result) return false;

    return result.length > MAX_USERS_PER_IP;
  },
  async getLicense(nickname: string) {
    type MojangPayload = |
    { uuid: string } |
    { reason: string; error: string };

    const result = await client
      .get(`${MOJANG_API_URL}/${nickname}`, {
        throwHttpErrors: false,
        timeout: 5000
      })
      .json<MojangPayload>();

    return result;
  },
  async unregister({
    nickname, strict = false,
  }: {
    nickname: string; strict?: boolean;
  }): Promise<{ nickname: string }> {
    const localLogger = authLogger.withTag("Unregister");
    localLogger.log(`Starting unregistering player ${nickname}. Strict: ${strict}`);

    const result = await general
      .transaction()
      .execute(async (trx) => {
        const auth = await trx
          .deleteFrom("AUTH")
          .where("LOWERCASENICKNAME", "=", nickname.toLowerCase())
          .executeTakeFirstOrThrow();

        if (!auth.numDeletedRows) {
          invariant(strict, "Error for deleting from auth");
        }

        localLogger.log(`Player ${nickname} from auth`);

        if (strict) {
          const players = await trx
            .deleteFrom("players")
            .where("nickname", "=", nickname)
            .executeTakeFirstOrThrow();

          invariant(players.numDeletedRows, "Error for deleting from players");
          localLogger.log(`Player ${nickname} from players`);
        }

        return { nickname };
      });

    return result;
  }
}