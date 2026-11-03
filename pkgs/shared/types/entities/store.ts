import type { JsonValue } from "@gen/db/general";

export type CartItem = {
	imageUrl: string;
	price: number;
	recipient: string;
	selected: boolean;
	quantity: number;
	id: number;
	description: string | null;
	value: string;
	type: string;
	command: string | null;
	currency: string;
	content: JsonValue;
	title: string;
};

export type OrdersGame = {
	type: "game";
	created_at: Date;
	initiator: string;
	unique_id: string;
	finished_at: Date | null;
	status: "succeeded";
};
