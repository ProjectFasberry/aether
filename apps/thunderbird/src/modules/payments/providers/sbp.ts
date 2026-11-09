import { getEnv } from "#/shared/env";
import type { PaymentProvider, WebhookEvent } from "../types";

/**
 * SBP adapter seam.
 *
 * The acquirer is not chosen yet, so the adapter is intentionally empty until
 * the provider contract and the fiscal receipt flow are known. Fill
 * `createInvoice` (invoice + QR/redirect), `verifyWebhook` (signature over the
 * raw body) and `parseStatus` when the provider is picked; the order, ledger
 * and webhook plumbing above it does not change.
 */
function config() {
	const env = getEnv();

	return {
		url: env.SBP_PROVIDER_URL,
		merchantId: env.SBP_MERCHANT_ID,
		apiKey: env.SBP_API_KEY,
	};
}

export const sbpProvider: PaymentProvider = {
	name: "sbp",
	currencies: ["RUB"],
	isConfigured() {
		const { url, merchantId, apiKey } = config();
		return Boolean(url && merchantId && apiKey);
	},
	async createInvoice() {
		throw new Error("SBP_NOT_IMPLEMENTED");
	},
	async verifyWebhook(): Promise<WebhookEvent | null> {
		throw new Error("SBP_NOT_IMPLEMENTED");
	},
};
