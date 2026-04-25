export type Land = {
	ulid: string;
	name: string;
	area: {
		ulid: string;
		holder: {
			roles: unknown[];
			trusted: string[];
		};
		settings: string[];
		invites: unknown[];
		tax: {
			current: number;
			time: number;
			before: number;
		};
		banned: unknown[];
	} | null;
	type: "LAND" | string;
	created_at: Date;
	title: string | null;
	chunks_amount: number | null;
	areas_amount: number | null;
	balance: number;
	stats: {
		kills: number;
		deaths: number;
		wins: number;
		defeats: number;
		captures: number;
	};
	level: number;
	limits: string[] | null;
	members: {
		nickname: string;
		uuid: string;
		role: number;
		avatar: string;
	}[];
	spawn: string | null;
	details: {
		banner: string | null;
		gallery: string[];
	};
};

export type Lands = Pick<Land, "ulid" | "title" | "name" | "level" | "created_at" | "type" | "stats" | "details"> & {
	members: [
		{
			uuid: string;
			avatar: string;
			chunks: number;
			nickname: string;
		},
	];
};

export type LandsPayload = {
	data: Lands[];
	meta: PaginatedMeta;
};

export type PlayerLands = {
	data: Array<
		Pick<Land, "ulid" | "name" | "title" | "created_at" | "type"> & {
			members: Array<{
				nickname: string;
				uuid: string;
				chunks: number;
			}>;
		}
	>;
	meta: { count: number };
};

export type PlayerLandsPayload = PlayerLands;
