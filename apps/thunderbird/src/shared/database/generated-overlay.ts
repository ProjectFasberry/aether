/**
 * Schema changes that are not in the generated types yet.
 *
 * `@gen/db/general` is generated from the production database, so migrations
 * `0034_roles_luckperms_group` and `0035_player_links` are invisible to it
 * until they are applied and `bun gen:types:db` runs. Interface merging keeps
 * the Kysely builder fully typed in the meantime. Remove the added members
 * right after the regeneration (identical members merge silently, but they
 * should live only in the generated file).
 */

import type { Generated } from "kysely";

declare module "@gen/db/general" {
	interface Roles {
		/** Migration 0034: LuckPerms group behind the panel role. */
		luckperms_group: string | null;
	}

	interface Referrals {
		/** Migration 0035: link the referral was accepted with. */
		link_id: number | null;
	}

	interface PlayerLinks {
		id: Generated<number>;
		token_hash: string;
		kind: "invite" | "referral";
		nickname: string | null;
		referrer: string | null;
		findout: string;
		created_by: string | null;
		created_at: Generated<Date>;
		expires_at: Date;
		used_at: Date | null;
		used_by: string | null;
		ip: string | null;
	}

	interface DB {
		player_links: PlayerLinks;
	}
}

export {};
