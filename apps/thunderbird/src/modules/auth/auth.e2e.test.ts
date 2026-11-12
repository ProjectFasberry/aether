import { beforeEach, describe, expect, it, mock } from "bun:test";
import Elysia from "elysia";
import { clientIp } from "@repo/shared/utils";
import { dummyDb } from "../economy/__tests__/mocks";
import { createFakeGeneral, MemoryRedis } from "./__tests__/fakes";

/**
 * End-to-end auth tests: the real routes, guards and session service run over
 * in-memory Postgres/Redis/NATS doubles, so a request goes through validation,
 * controllers and persistence the same way it does in the app.
 */

const fakeRedis = new MemoryRedis();
const { db: fakeGeneral, state } = createFakeGeneral();

const fakeEnv = {
	PORT: 3000,
	HOST: "127.0.0.1",
	PROD: false,
	CAP_URL: "https://cap.test",
	CAP_SITE_KEY: "site-key",
	CAP_SECRET: "secret",
	VOLUME_URL: "https://volume.test",
	NATS_HOST: "nats.test",
	NATS_USER: "user",
	NATS_PASSWORD: "pass",
} as never;

mock.module("#/shared/env", () => ({
	getEnv: () => fakeEnv,
	isProduction: false,
	initEnv: () => {},
}));

mock.module("#/shared/database/general-db", () => ({
	general: fakeGeneral,
	generalPool: {},
}));
mock.module("#/shared/database/playerpoints-db", () => ({
	playerpoints: dummyDb(),
	playerPointsPool: {},
}));
mock.module("#/shared/database/bisquite-db", () => ({
	bisquite: dummyDb(),
	bisquitePool: {},
}));

mock.module("#/shared/redis/client", () => ({
	redisService: {
		getInstance: () => fakeRedis,
		getBridgeInstance: () => fakeRedis,
		start: async () => {},
		logger: { child: () => ({ info: () => {}, error: () => {} }) },
	},
}));
mock.module("#/shared/redis/lock", () => ({
	withRedisLock: async (_key: string, _ttl: number, fn: () => Promise<unknown>) => fn(),
}));
mock.module("#/utils/config/log-utils", () => ({ logErrorMsg: () => {} }));

mock.module("#/shared/nats/client", () => {
	const connection = {
		publish: () => {},
		subscribe: () => ({ unsubscribe: () => {} }),
	};
	return { natsService: { getInstance: () => connection } };
});

mock.module("#/shared/services/urls", () => ({
	urlsService: {
		getWhitelistIpList: () => [],
		getData: () => new Map(),
	},
}));

mock.module("#/shared/services/skins", () => ({
	skinsService: {
		skin: { initSkin: async () => true },
		player: { getAvatar: async (nickname: string) => `https://volume.test/avatars/${nickname}.png` },
	},
}));

mock.module("#/shared/services/minio", () => ({
	minioService: { getInstance: () => ({}) },
}));
mock.module("#/shared/minio/utils", () => ({
	textSets: { "unsafe_passwords.txt": new Set(["qwerty123", "password"]) },
	reloadInternalFiles: async () => {},
}));

mock.module("#/modules/yggdrasil/token.model", () => ({
	tokenService: { revokeSession: async () => {} },
}));
mock.module("#/modules/account/account.model", () => ({
	changePassword: async () => ({ ok: true }),
}));

mock.module("#/lib/plugins/index", () => ({
	ipPlugin: () => new Elysia({ name: "ipPlugin" })
		.derive(({ headers }: { headers: Record<string, string | undefined> }) => ({ ip: clientIp(headers) }))
		.as("global"),
}));

const { auth } = await import("#/modules/auth");
const { invalidateOption, setOption } = await import("#/shared/constants/options");

/**
 * Mirrors the contract of the global `onError` in `src/app.ts`: a thrown
 * `status(code, "CODE")` becomes `{ error: "CODE" }` with that status. The real
 * handler is not exported, and loading the whole app would pull every module.
 */
const SAFE_ERROR_CODE = /^[A-Z][A-Z0-9_]*$/;

const app = new Elysia()
	.onError(({ error, code, set }) => {
		const customStatus = (error as { code?: unknown }).code;
		if (typeof customStatus === "number") set.status = customStatus;

		let message = "INTERNAL_SERVER_ERROR";

		if (code === "NOT_FOUND") return { error: code };
		if (code === "PARSE") return { error: "BAD_REQUEST" };

		if ("response" in error) {
			const response = error.response as { error?: string } | number;
			if (typeof response === "object" && response !== null) {
				if (response.error) message = response.error;
			} else {
				message = String(response);
			}
		}

		if (error instanceof Error) {
			return { error: SAFE_ERROR_CODE.test(error.message) ? error.message : "INTERNAL_SERVER_ERROR" };
		}

		return { error: message };
	})
	.use(auth);

type RequestInitWithHeaders = Omit<RequestInit, "headers"> & { headers?: Record<string, string> };

function call(path: string, init: RequestInitWithHeaders = {}): Promise<Response> {
	return app.handle(new Request(`http://localhost${path}`, {
		...init,
		headers: { "content-type": "application/json", ...init.headers },
	}));
}

function post(path: string, body: unknown, init: RequestInitWithHeaders = {}): Promise<Response> {
	return call(path, { method: "POST", body: JSON.stringify(body), ...init });
}

const sessionCookie = (response: Response): string | null => {
	const header = response.headers.get("set-cookie");
	const match = header?.match(/session=([^;]*)/);
	return match ? `session=${match[1]}` : null;
};

beforeEach(async () => {
	fakeRedis.strings.clear();
	fakeRedis.zsets.clear();

	state.accounts.length = 0;
	state.players.length = 0;
	state.findout.length = 0;
	state.referrals.length = 0;

	state.options.set("registrationEnabled", true);
	state.options.set("botCheckEnabled", false);
	await invalidateOption();
});

async function registerSteve(password = "hunter22") {
	return post("/auth/register", {
		nickname: "Steve",
		password,
		findout: "friend",
		findoutType: "custom",
	});
}

describe("POST /auth/register", () => {
	it("creates the account, credentials and findout row", async () => {
		const response = await registerSteve();

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ data: { nickname: "Steve" } });

		expect(state.accounts).toHaveLength(1);
		expect(state.accounts[0].lower_nickname).toBe("steve");
		expect(state.accounts[0].password_hash).not.toBe("hunter22");
		expect(state.players[0].nickname).toBe("Steve");
		expect(state.findout).toEqual([{ nickname: "Steve", value: "friend" }]);
	});

	it("registers a referral when the referrer is a player", async () => {
		state.players.push({ nickname: "Alex", uuid: "uuid-alex", created_at: new Date() });

		const response = await post("/auth/register", {
			nickname: "Steve",
			password: "hunter22",
			findout: "Alex",
			findoutType: "referrer",
		});

		expect(response.status).toBe(200);
		expect(state.referrals).toEqual([{ referrer: "Alex", referral: "Steve" }]);
		expect(state.findout).toHaveLength(0);
	});

	it("rejects a duplicate nickname", async () => {
		await registerSteve();

		const response = await registerSteve();

		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({ error: "USER_EXISTS" });
	});

	it("rejects a password from the unsafe list", async () => {
		const response = await registerSteve("qwerty123");

		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({ error: "PASSWORD_IS_UNSAFE" });
		expect(state.accounts).toHaveLength(0);
	});

	it("is closed when registration is disabled", async () => {
		await setOption("registrationEnabled", false);

		const response = await registerSteve();

		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({ error: "AUTHORIZATION_DISABLED" });
	});

	it("requires a CAP token when the bot check is on", async () => {
		await setOption("botCheckEnabled", true);

		const response = await registerSteve();

		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({ error: "TOKEN_IS_NOT_PROVIDED" });
	});
});

describe("POST /auth/login/basic", () => {
	it("returns the account and sets an httpOnly session cookie", async () => {
		await registerSteve();

		const response = await post("/auth/login/basic", { nickname: "Steve", password: "hunter22" });
		const body = await response.json() as { data: { nickname: string; uuid: string } };

		expect(response.status).toBe(200);
		expect(body.data.nickname).toBe("Steve");
		expect(body.data.uuid).toMatch(/^[0-9a-f-]{36}$/);
		expect(response.headers.get("set-cookie")).toContain("HttpOnly");
		expect(sessionCookie(response)).toContain("session=");
	});

	it("answers the same code for a wrong password and an unknown account", async () => {
		await registerSteve();

		const wrongPassword = await post("/auth/login/basic", { nickname: "Steve", password: "hunter23" });
		const unknown = await post("/auth/login/basic", { nickname: "Nobody", password: "hunter22" });

		expect(wrongPassword.status).toBe(400);
		expect(await wrongPassword.json()).toEqual({ error: "PASSWORD_OR_LOGIN_INCORRECT" });
		expect(unknown.status).toBe(400);
		expect(await unknown.json()).toEqual({ error: "PASSWORD_OR_LOGIN_INCORRECT" });
	});
});

describe("GET /auth/validate-session", () => {
	it("reports false without a cookie and true after login", async () => {
		const anonymous = await call("/auth/validate-session");
		expect(await anonymous.json()).toEqual({ data: false });

		await registerSteve();
		const login = await post("/auth/login/basic", { nickname: "Steve", password: "hunter22" });
		const cookie = sessionCookie(login);

		const response = await call("/auth/validate-session", { headers: { cookie: cookie ?? "" } });
		expect(await response.json()).toEqual({ data: true });
	});
});

describe("POST /auth/invalidate-session", () => {
	it("requires a session", async () => {
		const response = await call("/auth/invalidate-session", { method: "POST" });

		expect(response.status).toBe(401);
	});

	it("drops the session and clears the cookie", async () => {
		await registerSteve();
		const login = await post("/auth/login/basic", { nickname: "Steve", password: "hunter22" });
		const cookie = sessionCookie(login) ?? "";

		const response = await call("/auth/invalidate-session", { method: "POST", headers: { cookie } });
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ data: "OK" });
		expect(response.headers.get("set-cookie")).toContain("session=");

		const after = await call("/auth/validate-session", { headers: { cookie } });
		expect(await after.json()).toEqual({ data: false });
	});
});

describe("launcher auth", () => {
	async function launcherLogin() {
		await registerSteve();
		return post("/auth/client/login", { nickname: "Steve", password: "hunter22" });
	}

	it("logs in with a bearer token and a public avatar url", async () => {
		const response = await launcherLogin();
		const body = await response.json() as { data: { token: string; avatar: string; expires_at: string } };

		expect(response.status).toBe(200);
		expect(body.data.token).toEqual(expect.any(String));
		expect(body.data.avatar).toBe("http://localhost/avatars/Steve.png");
		expect(new Date(body.data.expires_at).getTime()).toBeGreaterThan(Date.now());
	});

	it("validates and then logs out the bearer session", async () => {
		const login = await launcherLogin();
		const { data } = await login.json() as { data: { token: string } };
		const headers = { authorization: `Bearer ${data.token}` };

		const valid = await call("/auth/client/validate", { headers });
		const identity = await valid.json() as { data: { nickname: string; expires_at: unknown } };
		expect(valid.status).toBe(200);
		expect(identity.data.nickname).toBe("Steve");
		expect(identity.data.expires_at).toBeNull();

		const logout = await call("/auth/client/logout", { method: "POST", headers });
		expect(await logout.json()).toEqual({ data: true });

		const after = await call("/auth/client/validate", { headers });
		expect(after.status).toBe(401);
	});

	it("rejects an unknown token", async () => {
		const response = await call("/auth/client/validate", { headers: { authorization: "Bearer nope" } });

		expect(response.status).toBe(401);
	});

	it("throttles repeated launcher logins per nickname", async () => {
		await registerSteve();

		const statuses: number[] = [];
		for (let attempt = 0; attempt < 7; attempt += 1) {
			const response = await post("/auth/client/login", { nickname: "Steve", password: "wrong-pass" });
			statuses.push(response.status);
		}

		expect(statuses.slice(0, 5).every((status) => status === 400)).toBe(true);
		expect(statuses.at(-1)).toBe(429);
	});
});
