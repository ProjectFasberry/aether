import { createHash } from "node:crypto";
import { getEnv } from "#/shared/env";
import { logger } from "@repo/shared/utils/logger";
import type { Context } from "elysia";
import { fromMinor, type PaymentProvider, type WebhookEvent } from "../types";
import { client } from "#/shared/api/client";

/**
 * Heleket (USDT/USDC) adapter.
 *
 * The request/response shape follows the documented v1 API; it has not been
 * exercised against a live merchant yet. Put `HELEKET_MERCHANT_UUID` and
 * `HELEKET_API_KEY` into the environment and the invoice route starts using it
 * without code changes. The callback signature is md5(base64(json) + key),
 * where `json` is the payload without the `sign` field.
 */
const DEFAULT_URL = "https://api.heleket.com/v1";

const STATUS_MAP: Record<string, WebhookEvent["status"]> = {
	paid: "succeeded",
	paid_over: "succeeded",
	wrong_amount: "failed",
	cancel: "failed",
	canceled: "failed",
	failed: "failed",
	expired: "expired",
};

function config() {
	const env = getEnv();

	return {
		url: env.HELEKET_API_URL ?? DEFAULT_URL,
		merchant: env.HELEKET_MERCHANT_UUID,
		apiKey: env.HELEKET_API_KEY,
	};
}

function sign(body: string, apiKey: string): string {
	return createHash("md5").update(Buffer.from(body, "utf8").toString("base64") + apiKey).digest("hex");
}

export const heleketProvider: PaymentProvider = {
	name: "heleket",
	currencies: ["USDT", "USDC"],

	isConfigured() {
		const { merchant, apiKey } = config();
		return Boolean(merchant && apiKey);
	},

	async createInvoice({ orderId, amountMinor, currency, expiresAt, origin }) {
		const { url, merchant, apiKey } = config();
		if (!merchant || !apiKey) throw new Error("PROVIDER_NOT_CONFIGURED");

		const body = {
			amount: fromMinor(amountMinor, currency).toFixed(6),
			currency,
			order_id: orderId,
			url_callback: `${origin}/payments/webhook/heleket`,
			url_return: `${origin}/payments/return`,
			expired_at: Math.floor(expiresAt.getTime() / 1000),
		};
		const raw = JSON.stringify(body);

		const response = await client(`${url}/payment`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				merchant,
				sign: sign(raw, apiKey),
			},
			body: raw,
		});

		const payload = await response.json() as {
			state?: number;
			message?: string;
			result?: { uuid?: string; url?: string };
		};

		if (!response.ok || payload.state !== 0 || !payload.result?.uuid) {
			logger.error({ name: "heleket", status: response.status, message: payload.message });
			throw new Error("PROVIDER_ERROR");
		}

		return {
			providerPaymentId: payload.result.uuid,
			payUrl: payload.result.url ?? null,
			status: "pending",
		};
	},

	async verifyWebhook(ctx: Context): Promise<WebhookEvent | null> {
		const { apiKey } = config();
		if (!apiKey) throw new Error("PROVIDER_NOT_CONFIGURED");

		const body = ctx.body as Record<string, unknown> | null;
		if (!body || typeof body !== "object") return null;

		const { sign: received, ...rest } = body;
		if (typeof received !== "string") return null;

		const expected = sign(JSON.stringify(rest), apiKey);
		if (expected !== received.toLowerCase()) return null;

		const status = STATUS_MAP[String(body.status ?? "")];
		const uuid = String(body.uuid ?? "");
		const orderId = String(body.order_id ?? "");

		if (!status || !uuid || !orderId) return null;

		const amount = body.amount ? Math.round(Number(body.amount) * 1e6) : undefined;

		return {
			eventId: String(body.id ?? `${uuid}:${body.status}`),
			orderId,
			providerPaymentId: uuid,
			status,
			amountMinor: body.currency && amount ? amount : undefined,
			currency: body.currency ? String(body.currency) : undefined,
		};
	},
};
