import { general } from "#/shared/database/general-db";
import { t } from "elysia";
import { buildSocials, SOCIAL_TITLES, toSocialPayload, type SocialPayload } from "#/shared/socials";

export const socialPayloadSchema = t.Object({
	value: t.String(),
	title: t.String(),
	isAvailable: t.Boolean(),
});

export async function getSocials(): Promise<SocialPayload[]> {
	const rows = await general
		.selectFrom("players_socials_available")
		.select(["value", "isAvailable"])
		.execute();

	return buildSocials(rows);
}

export async function setSocialAvailability(value: string, isAvailable: boolean): Promise<SocialPayload> {
	if (!Object.hasOwn(SOCIAL_TITLES, value)) throw new Error("SOCIAL_NOT_FOUND");

	const exists = await general
		.selectFrom("players_socials_available")
		.select(["value", "isAvailable"])
		.where("value", "=", value)
		.executeTakeFirst();

	if (exists) {
		await general
			.updateTable("players_socials_available")
			.set({ isAvailable })
			.where("value", "=", value)
			.execute();
	} else {
		await general
			.insertInto("players_socials_available")
			.values({ value, isAvailable })
			.execute();
	}

	return toSocialPayload(value, isAvailable);
}

