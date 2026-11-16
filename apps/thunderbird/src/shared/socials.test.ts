import { describe, expect, it } from "bun:test";
import { pickAvailableSocials, toSocialPayload } from "./socials";

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

describe("pickAvailableSocials", () => {
	const rows = [
		{ value: "telegram", isAvailable: true },
		{ value: "discord", isAvailable: false },
		{ value: "vk", isAvailable: null },
	];

	it("drops disabled and already linked socials", () => {
		expect(pickAvailableSocials(rows, ["vk"]).map((item) => item.value)).toEqual(["telegram"]);
	});

	it("keeps the database order", () => {
		expect(pickAvailableSocials(rows, []).map((item) => item.value)).toEqual(["telegram", "vk"]);
	});
});
