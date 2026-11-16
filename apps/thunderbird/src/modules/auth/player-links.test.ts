import { describe, expect, it, mock } from "bun:test";

mock.module("#/shared/database/general-db", () => ({ general: {} }));
mock.module("./auth.model", () => ({
	auth: { validatePasswordSafe: () => true },
	authLogger: { child: () => ({ info: () => {}, error: () => {} }) },
}));
mock.module("./register.model", () => ({
	register: { runPostRegistrationEffects: () => {} },
	createAccountRows: async () => ({ nickname: "Steve", created_at: new Date(), uuid: "uuid" }),
	offlineUuid: () => "uuid",
}));

const { hashLinkPassword } = await import("./player-links.model");

describe("link password", () => {
	it("stores a bcrypt hash, not the raw password", async () => {
		const hash = await hashLinkPassword("hunter22");

		expect(hash).not.toBe("hunter22");
		expect(hash.startsWith("$2")).toBe(true);
		expect(await Bun.password.verify("hunter22", hash)).toBe(true);
	});
});
