export type RatingData =
	| RatingPlaytime[]
	| RatingLands[]
	| RatingReputation[]
	| RatingCharism[]
	| RatingBelkoin[]
	| RatingParkour[];

type RatingMeta = {
	hasNextPage: boolean;
	startCursor?: string;
	endCursor?: string;
	hasPrevPage: boolean;
};

export type RatingPlaytime = {
	total: number;
	nickname: string;
	avatar: string;
};

export type RatingParkour = {
	gamesplayed: number | null;
	player: string | null;
	score: number | null;
	area: string | null;
	nickname: string | null;
	avatar: string;
};

export type RatingBelkoin = {
	nickname: string;
	balance: number;
	avatar: string;
};

export type RatingCharism = {
	balance: number;
	nickname: string;
	avatar: string;
};

export type RatingReputation = {
	reputation: number;
	uuid: string;
	nickname: string;
	avatar: string;
};

export type RatingLands = {
	land: string;
	chunks_amount: number;
	members: {
		[key: string]: {
			chunks: number;
			avatar: string;
			nickname: string;
		};
	};
	ulid: string;
	name: string;
	type: string;
	blocks: any;
};

export type RatingsPayload = {
	data: RatingData;
	meta: RatingMeta;
};
