import type { Json } from "@repo/shared/types/db/general-database-types";

export type News = {
	id: number;
	title: string;
	created_at: string | Date;
	description: string;
	imageUrl: string;
	views: number;
	creator: {
		nickname: string;
		avatar: string;
	};
	content: Json;
};

export type NewsPayload = {
	data: News[];
	meta: PaginatedMeta;
};
