import { createHash, randomBytes } from "node:crypto";
import { sql } from "kysely";
import { general } from "#/shared/database/general-db";
import { createError, withShared } from "#/helpers/error";
import { auth, authLogger } from "./auth.model";
import { createAccountRows, offlineUuid, register } from "./register.model";

/**
 * Invites and referrals share one table and one link format:
 * `https://app.fasberry.fun/auth?callback_query=<token>`. The token is stored
 * as a sha256 hash and is single-use, so a leaked database cannot mint links.
 *
 * Invite: an admin reserves the nickname, the player only sets a password.
 * Referral: a player generates the link; accepting it creates the account and
 * records the referral. The old `?referrer=<nickname>` links are gone: anybody
 * could claim any referrer and farm the yearly limit with alt accounts.
 */
export type PlayerLinkKind = "invite" | "referral";

const LINK_ERRORS = {
	LINK_NOT_FOUND: { msg: "Registration link not found", code: 404 },
	LINK_EXPIRED: { msg: "Registration link expired", code: 410 },
	LINK_USED: { msg: "Registration link already used", code: 409 },
	NICKNAME_TAKEN: { msg: "Nickname is already taken", code: 409 },
	ACCOUNT_MISSING: { msg: "Account for this link is missing", code: 404 },
	REFERRAL_LIMIT: { msg: "Referral limit reached", code: 409 },
	PASSWORD_IS_UNSAFE: { msg: "Password is unsafe", code: 400 },
} as const;

/** One registry for every link failure; routes read it with `reader`. */
export const linkError = createError(withShared(LINK_ERRORS), "INTERNAL_UNKNOWN");

export type CreatedLink = { token: string; expiresAt: Date };

/** Max accepted referrals per referrer in a rolling 12-month window. */
export const REFERRALS_PER_WINDOW = 5;

const DEFAULT_LINK_TTL_MS = 7 * 24 * 60 * 60 * 1000;
/** Referral payouts open one day after registration (anti alt-account). */
const REFERRAL_PAYOUT_DELAY_MS = 24 * 60 * 60 * 1000;
/** Rolling window used by the yearly limit; `sql` is the only way to express it. */
const REFERRAL_WINDOW_START = sql<Date>`now() - interval '12 months'`;

const linkLogger = authLogger.child({ name: "player-links" });

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

/** Credentials are stored hashed exactly like the password registration route. */
export async function hashLinkPassword(password: string) {
	if (!auth.validatePasswordSafe(password)) throw linkError.raise("PASSWORD_IS_UNSAFE");

	return Bun.password.hash(password, { algorithm: "bcrypt", cost: 10 });
}
const newToken = () => randomBytes(32).toString("base64url");

async function insertLink({
	kind,
	nickname,
	referrer,
	findout,
	createdBy,
	ttlMs = DEFAULT_LINK_TTL_MS,
}: {
	kind: PlayerLinkKind;
	nickname?: string | null;
	referrer?: string | null;
	findout: string;
	createdBy?: string | null;
	ttlMs?: number;
}): Promise<CreatedLink> {
	const token = newToken();
	const expiresAt = new Date(Date.now() + ttlMs);

	await general
		.insertInto("player_links")
		.values({
			token_hash: hashToken(token),
			kind,
			nickname: nickname ?? null,
			referrer: referrer ?? null,
			findout,
			created_by: createdBy ?? null,
			expires_at: expiresAt,
		})
		.execute();

	return { token, expiresAt };
}

/** Expires every unused link of the same kind and owner before issuing a new one. */
async function expireLinks(kind: PlayerLinkKind, owner: { nickname?: string; referrer?: string }) {
	if (kind === "invite" && owner.nickname) {
		await general
			.updateTable("player_links")
			.set({ expires_at: new Date() })
			.where("kind", "=", "invite")
			.where("nickname", "ilike", owner.nickname)
			.where("used_at", "is", null)
			.execute();
		return;
	}

	if (kind === "referral" && owner.referrer) {
		await general
			.updateTable("player_links")
			.set({ expires_at: new Date() })
			.where("kind", "=", "referral")
			.where("referrer", "=", owner.referrer)
			.where("used_at", "is", null)
			.execute();
	}
}

export async function createInviteLink({
	nickname,
	createdBy,
}: {
	nickname: string;
	createdBy?: string | null;
}): Promise<CreatedLink> {
	await expireLinks("invite", { nickname });
	return insertLink({ kind: "invite", nickname, findout: "invited", createdBy });
}

export async function createReferralLink({
	referrer,
	createdBy,
}: {
	referrer: string;
	createdBy?: string | null;
}): Promise<CreatedLink> {
	await expireLinks("referral", { referrer });
	return insertLink({ kind: "referral", referrer, findout: referrer, createdBy });
}

async function findLink(token: string, kind: PlayerLinkKind): Promise<{ id: number; nickname: string | null; referrer: string | null; findout: string }> {
	const row = await general
		.selectFrom("player_links")
		.select(["id", "kind", "nickname", "referrer", "findout", "expires_at", "used_at"])
		.where("token_hash", "=", hashToken(token))
		.executeTakeFirst();

	if (!row || row.kind !== kind) throw linkError.raise("LINK_NOT_FOUND");
	if (row.used_at) throw linkError.raise("LINK_USED");
	if (new Date(row.expires_at).getTime() <= Date.now()) throw linkError.raise("LINK_EXPIRED");

	return { id: row.id, nickname: row.nickname, referrer: row.referrer, findout: row.findout };
}

export async function checkLink(token: string): Promise<{ kind: PlayerLinkKind; nickname: string | null }> {
	const row = await general
		.selectFrom("player_links")
		.select(["kind", "nickname", "expires_at", "used_at"])
		.where("token_hash", "=", hashToken(token))
		.executeTakeFirst();

	if (!row) throw linkError.raise("LINK_NOT_FOUND");
	if (row.used_at) throw linkError.raise("LINK_USED");
	if (new Date(row.expires_at).getTime() <= Date.now()) throw linkError.raise("LINK_EXPIRED");

	return { kind: row.kind, nickname: row.nickname };
}

/** Invite acceptance: the account exists, only the password is missing. */
export async function acceptInvite({
	token,
	password,
	ip,
}: {
	token: string;
	password: string;
	ip?: string | null;
}): Promise<{ nickname: string }> {
	const link = await findLink(token, "invite");

	const nickname = link.nickname;
	if (!nickname) throw linkError.raise("ACCOUNT_MISSING");

	const passwordHash = await hashLinkPassword(password);

	const result = await general.transaction().execute(async (trx) => {
		// Lock the link row: two parallel accepts must not both set a password.
		const current = await trx
			.selectFrom("player_links")
			.select(["used_at", "expires_at"])
			.where("id", "=", link.id)
			.forUpdate()
			.executeTakeFirst();

		if (!current) throw linkError.raise("LINK_NOT_FOUND");
		if (current.used_at) throw linkError.raise("LINK_USED");
		if (new Date(current.expires_at).getTime() <= Date.now()) throw linkError.raise("LINK_EXPIRED");

		const account = await trx
			.selectFrom("accounts")
			.select("id")
			.where("lower_nickname", "=", nickname.toLowerCase())
			.executeTakeFirst();

		if (!account) throw linkError.raise("ACCOUNT_MISSING");

		const credentials = await trx
			.selectFrom("account_credentials")
			.select("account_id")
			.where("account_id", "=", account.id)
			.executeTakeFirst();

		if (credentials) throw linkError.raise("LINK_USED");

		await trx
			.insertInto("account_credentials")
			.values({ account_id: account.id, password_hash: passwordHash })
			.execute();

		await trx.insertInto("findout").values({ nickname, value: link.findout }).execute();

		await trx
			.updateTable("player_links")
			.set({ used_at: new Date(), used_by: nickname, ip: ip ?? null })
			.where("id", "=", link.id)
			.execute();

		return { nickname };
	});

	register.runPostRegistrationEffects({ nickname, uuid: offlineUuid(nickname) });
	linkLogger.info(`invite accepted for ${nickname}`);

	return result;
}

/** Referral acceptance: creates the account and records the referral. */
export async function acceptReferral({
	token,
	nickname,
	password,
	ip,
}: {
	token: string;
	nickname: string;
	password: string;
	ip?: string | null;
}): Promise<{ nickname: string }> {
	const link = await findLink(token, "referral");

	const referrer = link.referrer;
	if (!referrer) throw linkError.raise("ACCOUNT_MISSING");

	const passwordHash = await hashLinkPassword(password);

	const result = await general.transaction().execute(async (trx) => {
		// Lock the link first, then the referrer: one token must produce exactly
		// one account even if the request is replayed in parallel.
		const current = await trx
			.selectFrom("player_links")
			.select(["used_at", "expires_at"])
			.where("id", "=", link.id)
			.forUpdate()
			.executeTakeFirst();

		if (!current) throw linkError.raise("LINK_NOT_FOUND");
		if (current.used_at) throw linkError.raise("LINK_USED");
		if (new Date(current.expires_at).getTime() <= Date.now()) throw linkError.raise("LINK_EXPIRED");

		// Serialize accepts per referrer so two parallel registrations cannot
		// both pass the limit check.
		await sql`select pg_advisory_xact_lock(hashtext(${referrer}))`.execute(trx);

		const used = await trx
			.selectFrom("referrals")
			.select((expression) => expression.fn.countAll<number>().as("count"))
			.where("referrer", "=", referrer)
			.where("created_at", ">", REFERRAL_WINDOW_START)
			.executeTakeFirst();

		if (Number(used?.count ?? 0) >= REFERRALS_PER_WINDOW) throw linkError.raise("REFERRAL_LIMIT");

		const lowerNickname = nickname.toLowerCase();

		const accountExists = await trx
			.selectFrom("accounts")
			.select("id")
			.where("lower_nickname", "=", lowerNickname)
			.executeTakeFirst();

		if (accountExists) throw linkError.raise("NICKNAME_TAKEN");

		const playerExists = await trx
			.selectFrom("players")
			.select("nickname")
			.where("lower_case_nickname", "=", lowerNickname)
			.executeTakeFirst();

		if (playerExists) throw linkError.raise("NICKNAME_TAKEN");

		const rows = await createAccountRows(trx, { nickname, password: passwordHash });

		await trx
			.insertInto("referrals")
			.values({
				referrer,
				referral: nickname,
				payout_after: new Date(Date.now() + REFERRAL_PAYOUT_DELAY_MS),
				link_id: link.id,
			})
			.execute();

		await trx.insertInto("findout").values({ nickname, value: link.findout }).execute();

		await trx
			.updateTable("player_links")
			.set({ used_at: new Date(), used_by: nickname, ip: ip ?? null })
			.where("id", "=", link.id)
			.execute();

		return { nickname, uuid: rows.uuid };
	});

	register.runPostRegistrationEffects({ nickname, uuid: result.uuid });
	linkLogger.info(`referral accepted: ${nickname} by ${referrer}`);

	return { nickname: result.nickname };
}

export type ReferralStats = { used: number; remaining: number; limit: number };

export async function referralStats(referrer: string): Promise<ReferralStats> {
	const used = await general
		.selectFrom("referrals")
		.select((expression) => expression.fn.countAll<number>().as("count"))
		.where("referrer", "=", referrer)
		.where("created_at", ">", REFERRAL_WINDOW_START)
		.executeTakeFirst();

	// Postgres returns bigint counts as strings, so coerce before arithmetic
	// and before the number-typed response schema encodes the value.
	const count = Number(used?.count ?? 0);

	return {
		used: count,
		remaining: Math.max(0, REFERRALS_PER_WINDOW - count),
		limit: REFERRALS_PER_WINDOW,
	};
}
