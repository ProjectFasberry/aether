import { sql } from "kysely";
import { general } from "../database/general-db";
import { appLogger, logger } from "../logger";
import { invariant } from "@repo/shared/utils";

let CHATS = new Map<string, string>() // <chat_id, target>
let isRefreshing = false;

async function fetchChatIds(): Promise<typeof CHATS> {
  const rows = await general
    .selectFrom("tg_logs_chats")
    .select(["chat_id", "target"])
    .orderBy(sql`CASE WHEN chat_id::text LIKE '-%' THEN 0 ELSE 1 END`)
    .execute();

  if (rows.length === 0) {
    console.warn('Chats is empty')
  }

  return new Map(rows.map((b) => [String(b.chat_id), b.target]))
}

export const chats = {
  async init() {
    try {
      const { current } = await chats.updateChatsInternal();
      appLogger.info(`Telegram chats initialized. Loaded ${current} chats`);

      const str = Array.from(CHATS).map(([k, v]) => `${k}: ${v}`).join("\n")
      logger.info(str, { asBox: true, title: "Chats" })
    } catch (e) {
      appLogger.error(e);
      throw e;
    }
  },
  getData() {
    invariant(CHATS, "Chats is not defined");
    return CHATS;
  },
  async updateChatsInternal() {
    const prev = CHATS?.size ?? 0;
    const newData = await fetchChatIds();

    CHATS = Object.freeze(newData);

    return { prev, current: CHATS.size };
  },
  async revalidate(): Promise<{ ok: true; data: { upd: number; prev: number } } | { ok: false; error: unknown }> {
    if (isRefreshing) {
      return { ok: false, error: new Error("Refresh already in progress") };
    }

    isRefreshing = true;

    try {
      const { prev, current } = await chats.updateChatsInternal();
      return { ok: true as const, data: { upd: current, prev } };
    } catch (e) {
      return { ok: false as const, error: e };
    } finally {
      isRefreshing = false;
    }
  },
};
