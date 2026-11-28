import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { getEnv, isProduction } from "#/shared/env";

const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const PERIOD_S = 30;
const DIGITS = 6;
const BACKUP_CODE_LENGTH = 10;

/** Dev-only key; production must provide AUTH_TOTP_KEY (32 random bytes, base64). */
const DEV_KEY = Buffer.alloc(32, 7);

function encryptionKey(): Buffer {
	const raw = getEnv().AUTH_TOTP_KEY;

	if (!raw) {
		if (isProduction) throw new Error("TOTP_KEY_MISSING");
		return DEV_KEY;
	}

	const key = Buffer.from(raw, "base64");
	if (key.length !== 32) throw new Error("TOTP_KEY_INVALID");
	return key;
}

export function encodeBase32(bytes: Buffer): string {
	let bits = 0;
	let value = 0;
	let output = "";

	for (const byte of bytes) {
		value = (value << 8) | byte;
		bits += 8;

		while (bits >= 5) {
			output += BASE32[(value >>> (bits - 5)) & 31];
			bits -= 5;
		}
	}

	if (bits > 0) output += BASE32[(value << (5 - bits)) & 31];

	return output;
}

export function decodeBase32(input: string): Buffer {
	const clean = input.toUpperCase().replace(/[^A-Z2-7]/g, "");
	let bits = 0;
	let value = 0;
	const bytes: number[] = [];

	for (const char of clean) {
		const index = BASE32.indexOf(char);
		if (index < 0) continue;

		value = (value << 5) | index;
		bits += 5;

		if (bits >= 8) {
			bytes.push((value >>> (bits - 8)) & 0xff);
			bits -= 8;
		}
	}

	return Buffer.from(bytes);
}

export function generateSecret(bytes = 20): string {
	return encodeBase32(randomBytes(bytes));
}

export function totpCode(secret: string, step: number): string {
	const counter = Buffer.alloc(8);
	counter.writeBigUInt64BE(BigInt(step));
	const digest = createHmac("sha1", decodeBase32(secret)).update(counter).digest();
	const offset = digest[digest.length - 1] & 0x0f;
	const value =
		((digest[offset] & 0x7f) << 24)
		| (digest[offset + 1] << 16)
		| (digest[offset + 2] << 8)
		| digest[offset + 3];

	return String(value % 10 ** DIGITS).padStart(DIGITS, "0");
}

export function currentStep(now = Date.now()): number {
	return Math.floor(now / 1000 / PERIOD_S);
}

/** Returns the matched step so the caller can reject replays. */
export function verifyTotp(secret: string, code: string, window = 1): number | null {
	const normalized = code.replace(/\s+/g, "");
	if (!/^\d{6}$/.test(normalized)) return null;

	const step = currentStep();

	for (let offset = -window; offset <= window; offset += 1) {
		const expected = totpCode(secret, step + offset);
		const left = Buffer.from(expected);
		const right = Buffer.from(normalized);

		if (left.length === right.length && timingSafeEqual(left, right)) return step + offset;
	}

	return null;
}

export function otpauthUrl(nickname: string, secret: string): string {
	const label = encodeURIComponent(`Fasberry:${nickname}`);
	const params = new URLSearchParams({
		secret,
		issuer: "Fasberry",
		algorithm: "SHA1",
		digits: String(DIGITS),
		period: String(PERIOD_S),
	});

	return `otpauth://totp/${label}?${params.toString()}`;
}

export function encryptSecret(secret: string): string {
	const iv = randomBytes(12);
	const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
	const encrypted = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
	const tag = cipher.getAuthTag();

	return `v1:${iv.toString("base64")}:${tag.toString("base64")}:${encrypted.toString("base64")}`;
}

export function decryptSecret(value: string): string {
	const [version, iv, tag, payload] = value.split(":");
	if (version !== "v1" || !iv || !tag || !payload) throw new Error("TOTP_SECRET_INVALID");

	const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(iv, "base64"));
	decipher.setAuthTag(Buffer.from(tag, "base64"));

	return Buffer.concat([decipher.update(Buffer.from(payload, "base64")), decipher.final()]).toString("utf8");
}

export function normalizeBackupCode(code: string): string {
	return code.toUpperCase().replace(/[^A-Z2-7]/g, "");
}

export function hashBackupCode(code: string): string {
	return createHash("sha256").update(normalizeBackupCode(code)).digest("hex");
}

export function generateBackupCodes(count = 10): string[] {
	return Array.from({ length: count }, () => {
		const raw = encodeBase32(randomBytes(7)).slice(0, BACKUP_CODE_LENGTH);
		return `${raw.slice(0, 5)}-${raw.slice(5)}`;
	});
}
