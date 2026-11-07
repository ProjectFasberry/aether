import type * as z from "zod";
import type {
	paymentStatusSchema,
	paymentTypeSchema,
	paymentValueSchema,
} from "../../schemas/store/payment";

export type PaymentDonateType = string;
export type PaymentResponseStatus = z.infer<typeof paymentStatusSchema>;
export type PaymentType = z.infer<typeof paymentTypeSchema>;
export type PaymentValueType = z.infer<typeof paymentValueSchema>;

export type PaymentMeta = {
	nickname: string;
	paymentType: PaymentType;
	paymentValue: PaymentDonateType | string | number;
};

export type CreateOrderSkippedItem = {
	id: number;
	title: string;
	recipient: string;
	reason: "PERMISSION_ALREADY_PRESENT";
};

export type CreateOrderRoutePayload = {
	purchase: {
		uniqueId: string;
	};
	payload: {
		price: {
			BELKOIN: number;
			CHARISM: number;
		};
	};
	/** Items that were already owned and therefore not charged. */
	skipped?: CreateOrderSkippedItem[];
};
