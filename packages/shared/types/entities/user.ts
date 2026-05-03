import type { Donate } from "./donate";

export type Player = {
	nickname: string;
	lower_case_nickname: string;
	uuid: string;
	group: Donate;
	avatar: string;
	meta: {
		reg_date: string | Date;
		login_date: string | Date;
	};
	rate: {
		count: number;
		isRated: boolean;
	};
};
