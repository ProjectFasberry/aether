import { sql } from "kysely";
import { general } from "../database";
import { appLogger } from "../logger";
import { invariant } from "@repo/shared/lib/utils";

let CHATS: readonly string[] | null = null;
let isRefreshing = false;

async function fetchChatIds() {
	const rows = await general
		.selectFrom("tg_logs_chats")
		.select("chat_id")
		.orderBy(sql`CASE WHEN chat_id LIKE '-%' THEN 0 ELSE 1 END`)
		.execute();

	return rows.map((d) => d.chat_id);
}

export const chats = {
	async init() {
		if (CHATS !== null) return;

		try {
			const { current } = await chats.updateChatsInternal();
			appLogger.success(`Telegram chats initialized. Loaded ${current} chats.`);
		} catch (e) {
			appLogger.error(e);
			throw e;
		}
	},
	get() {
		invariant(CHATS, "Chats are not defined. Call initChats() first.");
		if (CHATS.length === 0) appLogger.warn("Chats list is empty");
		return CHATS;
	},
	async updateChatsInternal() {
		const prev = CHATS?.length ?? 0;
		const newData = await fetchChatIds();

		CHATS = Object.freeze(newData);

		return { prev, current: CHATS.length };
	},
	async revalidate(): Promise<
		{ ok: true; data: { upd: number; prev: number } } | { ok: false; error: Error | unknown }
	> {
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
