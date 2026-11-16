import { general } from "#/shared/database/general-db";
import { t } from "elysia";
import { toSocialPayload, type SocialPayload } from "#/shared/socials";

export const socialPayloadSchema = t.Object({
	value: t.String(),
	title: t.String(),
	isAvailable: t.Boolean(),
});

export async function getSocials(): Promise<SocialPayload[]> {
	const rows = await general
		.selectFrom("players_socials_available")
		.select(["value", "isAvailable"])
		.orderBy("id", "asc")
		.execute();

	return rows.map((row) => toSocialPayload(row.value, row.isAvailable ?? true));
}

export async function setSocialAvailability(value: string, isAvailable: boolean): Promise<SocialPayload> {
	const row = await general
		.updateTable("players_socials_available")
		.set({ isAvailable })
		.where("value", "=", value)
		.returning(["value", "isAvailable"])
		.executeTakeFirst();

	if (!row) throw new Error("SOCIAL_NOT_FOUND");

	return toSocialPayload(row.value, row.isAvailable ?? isAvailable);
}

