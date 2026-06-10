import Elysia from "elysia";
import { general } from "../shared/database";
import { bearer } from "@elysia/bearer";

export const getUserKey = (token: string) => `session:${token}`;
export const SESSION_KEY = "session";

export const defineSession = () =>
	new Elysia({ name: "defineSession" })
		.derive(({ cookie }) => ({ session: cookie[SESSION_KEY]?.value as string | undefined }))
		.as("global");

export async function handleUser(bearer: string): Promise<boolean> {
	const hash = new Bun.CryptoHasher("sha256").update(bearer).digest("hex");

	const query = await general.selectFrom("api_keys").select("id").where("key", "=", hash).executeTakeFirst();

	return Boolean(query?.id);
}

export const defineBearer = () =>
	new Elysia({ name: "defineBearer" })
		.use(bearer())
		.derive(async ({ bearer, status }) => {
			if (!bearer) throw status(401);

			const result = await handleUser(bearer);
			if (!result) throw status(401);

			return { bearer };
		})
		.as("scoped");
