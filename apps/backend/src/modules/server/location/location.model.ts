import { nats } from "#/shared/nats/client";
import { SUBJECTS } from "#/shared/nats/subjects";

export type UserLocation = {
	world: string;
	x: number;
	y: number;
	z: number;
	pitch: number;
	yaw: number;
	customLocation: string | null;
};

export async function getLocation(nickname: string) {
	const nc = nats.get()

	const payload = { event: SUBJECTS.SERVER.EVENTS.USER.GET_LOCATION, nickname };

	try {
		const res = await nc.request(SUBJECTS.SERVER.EVENTS.USER.EVENT, JSON.stringify(payload), { timeout: 1000 });
		if (!res) return null;

		const data = res.json<Omit<UserLocation, "customLocation">>();
		return data;
	} catch (e) {
		throw e;
	}
}

export function parseWorldName(input: string): string | null {
	const regex = /CraftWorld\{name=(.+?)\}/;
	const match = input.match(regex);
	return match ? match[1] : null;
}

interface Cuboid {
	minX: number;
	maxX: number;
	minZ: number;
	maxZ: number;
	title: string;
	world: "Offenburg" | "BisquiteWorld" | string;
}

type LocationNames = "spawnpoint" | "bar-brat";

const terrainMap: Map<LocationNames, Cuboid> = new Map([
	[
		"spawnpoint",
		{
			minX: 478,
			maxX: 493,
			minZ: -2689,
			maxZ: -2672,
			title: "Точка появления",
			world: "Offenburg",
		},
	],
	[
		"bar-brat",
		{
			minX: 503,
			maxX: 519,
			minZ: -2646,
			maxZ: -2628,
			title: "Бар <Брат>",
			world: "Offenburg",
		},
	],
]);

type GetCustomLocation = {
	world: string;
	coords: Pick<UserLocation, "x" | "z">;
};

export function getCustomLocation({ coords, world }: GetCustomLocation): string | null {
	const { x, z } = coords;

	let title: string | null = null;

	for (const [_, target] of terrainMap) {
		if (world === target.world) {
			if (x >= target.minX && x <= target.maxX && z >= target.minZ && z <= target.maxZ) {
				title = target.title;
				return title;
			}
		}
	}

	if (!title && world === "Offenburg") {
		title = "где-то на спавне";
		return title;
	}

	return null;
}
