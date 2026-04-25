import type { Donate } from "./donate";

export type MePayload = {
	nickname: string;
	uuid: string;
	meta: {
		login_date: Date;
		reg_date: Date;
		role: {
			id: number;
			name: string;
		};
		permissions: string[];
	};
	avatar: string;
};

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

export type PlayerActivityPayload =
	| {
			type: "online";
			nickname: string;
			server: string;
			issued_date: Date;
	  }
	| {
			type: "offline";
			nickname: string;
			issued_date: Date | null;
	  };

export type PlayerActivitySummaryPayload = {
	[k: string]: {
		[k: string]: number;
	};
};
