import { general } from "#/shared/database/general-db";
import { redisService } from "#/shared/redis/client";
import { encodeBase32LowerCaseNoPadding } from "@oslojs/encoding";
import { auth } from "./auth.model";
import {
	currentStep,
	decryptSecret,
	encryptSecret,
	generateBackupCodes,
	generateSecret,
	hashBackupCode,
	normalizeBackupCode,
	otpauthUrl,
	verifyTotp,
} from "./totp";

export const TWO_FACTOR_CHALLENGE_TTL_S = 5 * 60;
export const TWO_FACTOR_MAX_ATTEMPTS = 5;

export type TwoFactorStatus = {
	enabled: boolean;
	backupCodesRemaining: number;
};

type Challenge = {
	nickname: string;
	ip: string;
	ua: string;
	client: "web" | "launcher";
	attempts: number;
};

const challengeKey = (token: string) => `auth:2fa:${token}`;

async function getAccount(nickname: string) {
	return general
		.selectFrom("accounts")
		.select(["id", "nickname"])
		.where("lower_nickname", "=", nickname.toLowerCase())
		.executeTakeFirst();
}

async function getTotp(accountId: number) {
	return general
		.selectFrom("account_totp")
		.select(["account_id", "secret", "confirmed_at", "last_used_step"])
		.where("account_id", "=", accountId)
		.executeTakeFirst();
}

export async function isTwoFactorEnabled(nickname: string): Promise<boolean> {
	const account = await getAccount(nickname);
	if (!account) return false;

	const row = await getTotp(account.id);
	return Boolean(row?.confirmed_at);
}

export async function getTwoFactorStatus(nickname: string): Promise<TwoFactorStatus> {
	const account = await getAccount(nickname);
	if (!account) return { enabled: false, backupCodesRemaining: 0 };

	const row = await getTotp(account.id);
	const remaining = await general
		.selectFrom("account_backup_codes")
		.select((eb) => eb.fn.countAll<number>().as("count"))
		.where("account_id", "=", account.id)
		.where("used_at", "is", null)
		.executeTakeFirst();

	return {
		enabled: Boolean(row?.confirmed_at),
		backupCodesRemaining: Number(remaining?.count ?? 0),
	};
}

/** Creates a pending secret. The caller shows the secret/otpauth once. */
export async function startTwoFactorSetup(nickname: string): Promise<{ secret: string; otpauth: string } | null> {
	const account = await getAccount(nickname);
	if (!account) return null;

	const existing = await getTotp(account.id);
	if (existing?.confirmed_at) throw new Error("TWO_FACTOR_ALREADY_ENABLED");

	const secret = generateSecret();
	const encrypted = encryptSecret(secret);

	await general
		.insertInto("account_totp")
		.values({ account_id: account.id, secret: encrypted })
		.onConflict((oc) =>
			oc.column("account_id").doUpdateSet({
				secret: encrypted,
				confirmed_at: null,
				last_used_step: null,
				updated_at: new Date(),
			})
		)
		.execute();

	return { secret, otpauth: otpauthUrl(account.nickname, secret) };
}

export async function confirmTwoFactorSetup(nickname: string, code: string): Promise<string[] | null> {
	const account = await getAccount(nickname);
	if (!account) return null;

	const row = await getTotp(account.id);
	if (!row || row.confirmed_at) throw new Error("TWO_FACTOR_NOT_PENDING");

	const step = verifyTotp(decryptSecret(row.secret), code);
	if (step === null) return null;

	const codes = generateBackupCodes();

	await general.transaction().execute(async (trx) => {
		await trx
			.updateTable("account_totp")
			.set({ confirmed_at: new Date(), last_used_step: step, updated_at: new Date() })
			.where("account_id", "=", account.id)
			.execute();

		await trx.deleteFrom("account_backup_codes").where("account_id", "=", account.id).execute();
		await trx
			.insertInto("account_backup_codes")
			.values(codes.map((codeValue) => ({ account_id: account.id, code_hash: hashBackupCode(codeValue) })))
			.execute();
	});

	return codes;
}

export async function disableTwoFactor(
	nickname: string,
	password: string,
	code: string,
): Promise<boolean | null> {
	const account = await auth.getAccount(nickname);
	if (!account) return null;

	const passwordOk = await Bun.password.verify(password, account.hash);
	if (!passwordOk) return false;

	const row = await getTotp(account.id);
	if (!row?.confirmed_at) return false;

	const step = verifyTotp(decryptSecret(row.secret), code);
	if (step === null) return false;

	await general.transaction().execute(async (trx) => {
		await trx.deleteFrom("account_totp").where("account_id", "=", account.id).execute();
		await trx.deleteFrom("account_backup_codes").where("account_id", "=", account.id).execute();
	});

	return true;
}

/**
 * Verifies a TOTP code or a one-time backup code. A TOTP code can be used once:
 * the stored step prevents replay within the window.
 */
export async function verifySecondFactor(
	nickname: string,
	code: string,
): Promise<{ ok: boolean; backup: boolean }> {
	const account = await getAccount(nickname);
	if (!account) return { ok: false, backup: false };

	const row = await getTotp(account.id);
	if (!row?.confirmed_at) return { ok: false, backup: false };

	const step = verifyTotp(decryptSecret(row.secret), code);

	if (step !== null && step > Number(row.last_used_step ?? 0)) {
		await general
			.updateTable("account_totp")
			.set({ last_used_step: step, updated_at: new Date() })
			.where("account_id", "=", account.id)
			.execute();

		return { ok: true, backup: false };
	}

	const hash = hashBackupCode(normalizeBackupCode(code));
	const backup = await general
		.selectFrom("account_backup_codes")
		.select("id")
		.where("account_id", "=", account.id)
		.where("code_hash", "=", hash)
		.where("used_at", "is", null)
		.executeTakeFirst();

	if (!backup) return { ok: false, backup: false };

	await general
		.updateTable("account_backup_codes")
		.set({ used_at: new Date() })
		.where("id", "=", backup.id)
		.where("used_at", "is", null)
		.execute();

	return { ok: true, backup: true };
}

export async function createTwoFactorChallenge(input: Omit<Challenge, "attempts">): Promise<string> {
	const token = encodeBase32LowerCaseNoPadding(crypto.getRandomValues(new Uint8Array(24)));
	const payload: Challenge = { ...input, attempts: 0 };

	await redisService
		.getInstance()
		.set(challengeKey(token), JSON.stringify(payload), "EX", TWO_FACTOR_CHALLENGE_TTL_S);

	return token;
}

/**
 * Returns the original login context after a valid code. A failed attempt
 * increments the counter; five failures burn the challenge.
 */
export async function consumeTwoFactorChallenge(
	token: string,
	code: string,
): Promise<Omit<Challenge, "attempts"> | null> {
	const redis = redisService.getInstance();
	const key = challengeKey(token);
	const raw = await redis.get(key);
	if (!raw) return null;

	let payload: Challenge;
	try {
		payload = JSON.parse(raw) as Challenge;
	} catch {
		await redis.del(key);
		return null;
	}

	if (payload.attempts >= TWO_FACTOR_MAX_ATTEMPTS) {
		await redis.del(key);
		return null;
	}

	const result = await verifySecondFactor(payload.nickname, code);

	if (!result.ok) {
		payload.attempts += 1;
		await redis.set(key, JSON.stringify(payload), "EX", TWO_FACTOR_CHALLENGE_TTL_S);
		return null;
	}

	await redis.del(key);

	return { nickname: payload.nickname, ip: payload.ip, ua: payload.ua, client: payload.client };
}

export { currentStep };
