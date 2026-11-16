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

/** Available for linking: enabled and not linked yet. */
export function pickAvailableSocials(
	rows: { value: string; isAvailable: boolean | null }[],
	linked: string[],
): SocialPayload[] {
	const linkedSet = new Set(linked);

	return rows
		.filter((row) => row.isAvailable !== false && !linkedSet.has(row.value))
		.map((row) => toSocialPayload(row.value, row.isAvailable));
}
