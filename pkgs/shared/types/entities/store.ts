import type { CreateOrderTopUpSchema } from "../../schemas/payment";
import type { JsonValue } from "../db/general-database-types";

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

export type OrderSingleGamePayload = {
	unique_id: string;
	initiator: string;
	created_at: Date;
	finished_at: Date | null;
	items: {
		id: number;
		store_item_id: number;
		name: string;
		recipient: string;
	}[];
};

export type OrderSingle = OrderSingleDefault | OrderSingleGamePayload;

export type OrderSinglePayload = OrderSingle & {
	type: "game" | "default";
};

export type OrderAsset = "USDT" | "TON" | "BTC" | "ETH" | "LTC" | "BNB" | "TRX" | "USDC";

export type OrderSingleDefault = {
	unique_id: string;
	asset: "USDT" | "TON" | "BTC" | "ETH" | "LTC" | "BNB" | "TRX" | "USDC";
	price: string;
	created_at: Date | string;
	status: "canceled" | "pending" | "succeeded" | "waitingForCapture";
	payload: string;
	order_id: string;
	invoice_id: number;
	pay_url: string;
	initiator: string;
	comment?: string | null
};

export type OrdersDefault = OrderSingleDefault & {
	type: "default";
};

export type OrdersGame = {
	type: "game";
	created_at: Date;
	initiator: string;
	unique_id: string;
	finished_at: Date | null;
	status: "succeeded";
};

export type Orders = OrdersGame | OrdersDefault;
