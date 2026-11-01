import { general } from "#/shared/database/general-db";

/**
 * Yggdrasil speaks undashed UUIDs (`31f2...`), our database keeps the dashed
 * form, so every crossing converts explicitly instead of relying on luck.
 */
export type AccountProfile = {
	id: number;
	uuid: string;
	nickname: string;
};

export type YggdrasilProfile = {
	id: string;
	name: string;
	properties: Array<{ name: string; value: string; signature?: string }>;
};

export const undash = (uuid: string) => uuid.replace(/-/g, "");

export const dash = (id: string) =>
	`${id.slice(0, 8)}-${id.slice(8, 12)}-${id.slice(12, 16)}-${id.slice(16, 20)}-${id.slice(20)}`;

export const profileService = {
	async byNickname(nickname: string): Promise<AccountProfile | null> {
		const query = await general
			.selectFrom("accounts")
			.select(["id", "uuid", "nickname"])
			.where("lower_nickname", "=", nickname.toLowerCase())
			.executeTakeFirst();

		return query ?? null;
	},
	async byId(id: string): Promise<AccountProfile | null> {
		const uuid = id.length === 32 ? dash(id) : id;

		const query = await general
			.selectFrom("accounts")
			.select(["id", "uuid", "nickname"])
			.where("uuid", "=", uuid)
			.executeTakeFirst();

		return query ?? null;
	},
	toProfile(
		account: AccountProfile,
		properties: YggdrasilProfile["properties"] = [],
	): YggdrasilProfile {
		return {
			id: undash(account.uuid),
			name: account.nickname,
			properties,
		};
	},
};
