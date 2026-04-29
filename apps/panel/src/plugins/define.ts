import Elysia from "elysia";
import { general } from "../shared/database";
import { redis } from "../shared/redis/client";
import { logger } from "../shared/logger";
import { safeJsonParse } from "@repo/shared/lib/utils";
import { bearer } from "@elysia/bearer";

type UserSessionPayload = {
	nickname: string;
	browser: string;
	ip: string;
	os: string;
	platform: string;
	created_at: string | Date;
};

export const getUserKey = (token: string) => `session:${token}`;
export const SESSION_KEY = "session";

async function getPermissions(nickname: string, role_id: number): Promise<string[]> {
	const effectivePermissions = await general
		.selectFrom("permissions as p")
		.select(["p.name"])
		.where(
			"p.id",
			"in",
			general.selectFrom("role_permissions as rp").where("rp.role_id", "=", role_id).select("rp.permission_id"),
		)
		.union(
			general
				.selectFrom("permissions as p")
				.innerJoin("players_permissions as pp", "pp.permission_id", "p.id")
				.where("pp.nickname", "=", nickname)
				.select(["p.name"]),
		)
		.execute();

	const perms = effectivePermissions.map((p) => p.name);
	return perms;
}

export async function getUserNickname(token: string): Promise<string | null> {
	const client = redis.get();

	const data = await client.get(getUserKey(token));
	if (!data) return null;

	const result = safeJsonParse<UserSessionPayload>(data);
	if (!result.ok) return null;

	return result.value.nickname ?? null;
}

async function handleAuthedByApiUser(apiKey: string | undefined): Promise<{ nickname: string } | null> {
	if (!apiKey) return null;

	if (apiKey.trim().length !== 0) {
		const query = await general
			.selectFrom("api_keys")
			.select(["key", "nickname"])
			.where("key", "=", apiKey)
			.executeTakeFirst();

		if (!query) return null;

		return { nickname: query.nickname };
	}

	return null;
}

export const defineSession = () =>
	new Elysia().derive(({ cookie }) => ({ session: cookie[SESSION_KEY]?.value as string | undefined })).as("global");

export const validatePermission = (permission: string) =>
	new Elysia()
		.use(defineUserRole())
		.derive(async ({ role, nickname, status }) => {
			if (!Bun.env.PROD) logger.log("validatePermission");

			const perms = await getPermissions(nickname, role.id);

			const targetIsExist = perms.includes(permission);
			if (!targetIsExist) throw status(400, "restricted_by_role");

			return { role, permission };
		})
		.as("scoped");

export const defineUser = () =>
	new Elysia()
		.use(defineSession())
		.use(bearer())
		.derive(async ({ session, status, bearer }) => {
			if (!Bun.env.PROD) logger.log("defineUser");

			const result = await handleAuthedByApiUser(bearer);
			if (result) return result;

			if (!session) throw status(401);

			const nickname: string | null = await getUserNickname(session);
			if (!nickname) throw status(401);

			return { nickname };
		})
		.as("scoped");

export const defineUserRole = () =>
	new Elysia()
		.use(defineUser())
		.derive(async ({ nickname, status, bearer }) => {
			if (!Bun.env.PROD) logger.log("defineUserRole");

			let role: { id: number; name: string } | null = null;

			const result = await handleAuthedByApiUser(bearer);

			if (result?.nickname) {
				// todo: impl correct way for define the highest role
				role = { id: 3, name: "admin" };
				return { role };
			}

			role = await general
				.selectFrom("players")
				.innerJoin("roles", "roles.id", "players.role_id")
				.select(["roles.id", "roles.name"])
				.where("players.nickname", "=", nickname)
				.executeTakeFirstOrThrow();

			if (!role) throw status(500);
			return { role };
		})
		.as("scoped");
