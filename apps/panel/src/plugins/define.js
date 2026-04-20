import Elysia from "elysia";
import { isProduction } from "../shared/env";
import { general } from "../shared/database";
import { getRedis } from "../shared/redis";
import { logger } from "../shared/logger";
import { safeJsonParse } from "@repo/shared/lib/utils";
export const validateLogger = logger.withTag("Validation");
export const getUserKey = (token) => `session:${token}`;
export const SESSION_KEY = "session";
export async function getPermissions(nickname, role_id) {
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
export async function getUserNickname(token) {
	const redis = getRedis();
	const data = await redis.get(getUserKey(token));
	if (!data) return null;
	const result = safeJsonParse(data);
	if (!result.ok) return null;
	return result.value.nickname ?? null;
}
export async function handleAuthedByApiUser(headers) {
	const apiKeyRaw = headers["authorization"];
	const apiKey = apiKeyRaw?.replace("Bearer", "").trim();
	if (!!apiKey && apiKey.trim().length !== 0) {
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
	new Elysia()
		.derive(({ cookie }) => {
			const sessionCookie = cookie[SESSION_KEY];
			const session = sessionCookie.value;
			return { session };
		})
		.as("global");
export const validatePermission = (permission) =>
	new Elysia()
		.use(defineUserRole())
		.derive(async ({ role, nickname, status }) => {
			if (!isProduction) {
				validateLogger.log("validatePermission");
			}
			const perms = await getPermissions(nickname, role.id);
			const targetIsExist = perms.includes(permission);
			if (!targetIsExist) throw status(400, "restricted_by_role");
			return { role, permission };
		})
		.as("scoped");
export const defineUser = () =>
	new Elysia()
		.use(defineSession())
		.derive(async ({ session, status, headers }) => {
			const result = await handleAuthedByApiUser(headers);
			if (result) return result;
			if (!isProduction) {
				validateLogger.log("defineUser");
			}
			if (!session) throw status(401);
			const nickname = await getUserNickname(session);
			if (!nickname) throw status(401);
			return { nickname };
		})
		.as("scoped");
export const defineUserRole = () =>
	new Elysia()
		.use(defineUser())
		.derive(async ({ nickname, status, headers }) => {
			let role = null;
			const result = await handleAuthedByApiUser(headers);
			if (result) {
				// todo: impl correct way for define the highest role
				role = { id: 3, name: "admin" };
				return { role };
			}
			if (!isProduction) {
				validateLogger.log("defineUserRole");
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
