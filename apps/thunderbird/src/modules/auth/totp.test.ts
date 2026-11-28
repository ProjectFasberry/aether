import { describe, expect, it } from "bun:test";
import {
	decodeBase32,
	encodeBase32,
	generateBackupCodes,
	generateSecret,
	hashBackupCode,
	normalizeBackupCode,
	totpCode,
} from "./totp";

const RFC_SECRET = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ"; // "12345678901234567890"

describe("base32", () => {
	it("round-trips bytes", () => {
		const bytes = Buffer.from("12345678901234567890", "ascii");

		expect(decodeBase32(encodeBase32(bytes)).toString("ascii")).toBe("12345678901234567890");
	});

	it("generates a 32-character secret from 20 bytes", () => {
		expect(generateSecret()).toHaveLength(32);
	});
});

describe("totp", () => {
	it("matches the RFC 6238 SHA-1 vector at step 1", () => {
		// RFC 6238 uses 8 digits; the 6-digit suffix is the same value.
		expect(totpCode(RFC_SECRET, 1)).toBe("287082");
	});
});

describe("backup codes", () => {
	it("normalizes case, dashes and spaces", () => {
		expect(normalizeBackupCode(" abcd-efgh ")).toBe("ABCDEFGH");
	});

	it("hashes the normalized value", () => {
		expect(hashBackupCode("ABCDE-FGHIJ")).toBe(hashBackupCode("abcde fghij"));
	});

	it("generates ten grouped codes", () => {
		const codes = generateBackupCodes();

		expect(codes).toHaveLength(10);
		for (const code of codes) {
			expect(code).toMatch(/^[A-Z2-7]{5}-[A-Z2-7]{5}$/);
		}
	});
});
