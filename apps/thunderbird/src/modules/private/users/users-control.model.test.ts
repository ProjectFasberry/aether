import { beforeEach, describe, expect, it, mock } from "bun:test";

type Command = { parent: string; value: string; meta?: unknown };

const commands: Command[] = [];

mock.module("#/shared/nats/command", () => ({
	callServerCommand: async (command: Command) => {
		commands.push(command);
		return { result: "success" };
	},
}));
mock.module("#/shared/database/general-db", () => ({ general: {} }));
mock.module("#/shared/services/permission-cache", () => ({ clearPermissionCache: () => {} }));

const { restrictUser } = await import("./users-control.model");

beforeEach(() => {
	commands.length = 0;
});

describe("restrictUser", () => {
	it("sends a CMI ban command to the player's backend", async () => {
		const result = await restrictUser({
			type: "ban",
			nicknames: ["Steve"],
			args: { time: "7d", reason: "spam" },
		});

		expect(result).toEqual({ ok: true, type: "ban", payload: ["Steve"] });
		expect(commands).toEqual([
			{
				parent: "cmi",
				value: "ban Steve 7d spam",
				meta: { recipient: "Steve", fallbackServer: "bisquite" },
			},
		]);
	});

	it("omits missing arguments", async () => {
		await restrictUser({ type: "kick", nicknames: ["Alex"], args: {} });

		expect(commands[0]?.value).toBe("kick Alex");
	});

	it("does not append undefined to unban", async () => {
		await restrictUser({ type: "unban", nicknames: ["Steve"], args: {} });

		expect(commands[0]?.value).toBe("unban Steve");
	});

	it("runs the command for every nickname", async () => {
		await restrictUser({ type: "mute", nicknames: ["Steve", "Alex"], args: { time: "1h" } });

		expect(commands.map((command) => command.value)).toEqual(["mute Steve 1h", "mute Alex 1h"]);
	});
});
