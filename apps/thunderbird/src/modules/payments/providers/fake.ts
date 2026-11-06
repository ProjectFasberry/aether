import type { PaymentProvider } from "../types";

/**
 * Test provider. It opens a local checkout page and settles the order from the
 * admin panel, so the whole invoice -> credit -> refund path can be exercised
 * without a real acquirer. It is only reachable with `economy.write`.
 */
export const fakeProvider: PaymentProvider = {
	name: "fake",
	currencies: ["RUB", "USDT", "USDC"],

	isConfigured() {
		return true;
	},

	async createInvoice({ orderId, origin }) {
		return {
			providerPaymentId: `fake:${orderId}`,
			payUrl: `${origin}/payments/fake/${orderId}`,
			status: "pending",
		};
	},

	async verifyWebhook() {
		// The fake provider has no callbacks; the admin route settles directly.
		return null;
	},
};
