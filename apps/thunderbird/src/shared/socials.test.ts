import { describe, expect, it } from "bun:test";
import { buildSocials, pickAvailableSocials, toSocialPayload } from "./socials";

describe("toSocialPayload", () => {
	it("adds the display title and treats a missing flag as enabled", () => {
		expect(toSocialPayload("telegram", null)).toEqual({
			value: "telegram",
			title: "Telegram",
			isAvailable: true,
		});
		expect(toSocialPayload("discord", true)).toEqual({
			value: "discord",
			title: "Discord",
			isAvailable: true,
		});
	});

	it("keeps unknown socials under their raw id", () => {
		expect(toSocialPayload("vk", false)).toEqual({
			value: "vk",
			title: "vk",
			isAvailable: false,
		});
	});
});

describe("buildSocials", () => {
	it("returns every known social, enabled unless a row disables it", () => {
		const socials = buildSocials([{ value: "discord", isAvailable: false }]);

		expect(socials).toEqual([
			{ value: "telegram", title: "Telegram", isAvailable: true },
			{ value: "discord", title: "Discord", isAvailable: false },
		]);
	});

	it("ignores unknown rows", () => {
		const socials = buildSocials([{ value: "vk", isAvailable: true }]);

		expect(socials.map((item) => item.value)).toEqual(["telegram", "discord"]);
	});
});

describe("pickAvailableSocials", () => {
	const socials = buildSocials([{ value: "discord", isAvailable: false }]);

	it("drops disabled and already linked socials", () => {
		expect(pickAvailableSocials(socials, []).map((item) => item.value)).toEqual(["telegram"]);
		expect(pickAvailableSocials(socials, ["telegram"])).toEqual([]);
	});
});
