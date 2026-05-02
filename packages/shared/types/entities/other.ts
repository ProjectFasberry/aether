export type StatusPayload = {
	proxy: {
		status: string;
		online: number;
		max: number;
		players: string[];
	};
	servers: {
		[key: string]: {
			online: number;
			max: number;
			thumbnail: string;
			fullname: string;
			players: string[];
			status: string;
			available: boolean;
			description?: string;
		};
	};
};

export type EventPayload = {
	id: string;
	type: string;
	title: string;
	content: {
		created_at: string | Date;
		description: string | null;
		initiator: string;
	};
};

export type AppOptionsPayload = {
	bannerIsExists: boolean;
	isBanned: boolean;
	isAuth: boolean;
	isWl: boolean;
	pofEnabled: boolean;
};

export type SeemsLikePlayer = {
	nickname: string;
	uuid: string;
	seemsRate: number;
	avatar: string;
};

export type SeemsLikePlayersPayload = {
	data: SeemsLikePlayer[];
	meta: {
		count: number;
	};
};

export type TaskItem = {
	id: number;
	description: string;
	created_at: Date;
	title: string;
	expires: Date | null;
	action_type: string;
	action_value: string | null;
	reward_currency: string;
	reward_value: number;
};

export type TasksPayload = {
	data: TaskItem[];
	meta: PaginatedMeta;
};

export type MethodsPayload = {
	id: number;
	description: string | null;
	imageUrl: string;
	title: string;
	value: string;
}[];

export type PrivatedMethodsPayload = {
	id: number;
	description: string | null;
	imageUrl: string;
	isAvailable: boolean;
	title: string;
	value: string;
}[];

export type PrivatedUser = {
	id: number;
	lower_case_nickname: string;
	premium_uuid: string | null;
	uuid: string;
	created_at: Date;
	avatar: string;
	nickname: string;
	role_id: number;
	role_name: string;
	status: "default" | "banned" | "muted";
};

export type PrivatedUsersPayload = {
	data: PrivatedUser[];
	meta: PaginatedMeta;
};

export type SkinsHistory = {
	skin_identifier: string;
	skin_variant: string | null;
	timestamp: number;
	skin_url: string | null;
	skin_head_url: string | null;
};
