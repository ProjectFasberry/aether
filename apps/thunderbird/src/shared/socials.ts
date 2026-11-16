/** Social ids that can be linked to an account and their display titles. */
export const SOCIAL_TITLES: Record<string, string> = {
	telegram: "Telegram",
	discord: "Discord",
};

export type SocialPayload = {
	value: string;
	title: string;
	isAvailable: boolean;
};

export function toSocialPayload(value: string, isAvailable: boolean | null): SocialPayload {
	return {
		value,
		title: SOCIAL_TITLES[value] ?? value,
		isAvailable: isAvailable !== false,
	};
}

/** Known socials with their availability; missing rows default to enabled. */
export function buildSocials(
	rows: { value: string; isAvailable: boolean | null }[],
): SocialPayload[] {
	const availability = new Map(rows.map((row) => [row.value, row.isAvailable]));

	return Object.keys(SOCIAL_TITLES).map((value) =>
		toSocialPayload(value, availability.get(value) ?? true)
	);
}

/** Available for linking: enabled and not linked yet. */
export function pickAvailableSocials(socials: SocialPayload[], linked: string[]): SocialPayload[] {
	const linkedSet = new Set(linked);

	return socials.filter((social) => social.isAvailable && !linkedSet.has(social.value));
}
