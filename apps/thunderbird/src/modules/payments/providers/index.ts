import { fakeProvider } from "./fake";
import { heleketProvider } from "./heleket";
import { sbpProvider } from "./sbp";
import type { PaymentProvider, PaymentProviderName } from "../types";

const registry: Record<PaymentProviderName, PaymentProvider> = {
	fake: fakeProvider,
	sbp: sbpProvider,
	heleket: heleketProvider,
};

export function getProvider(name: string): PaymentProvider | null {
	if (!(name in registry)) return null;

	return registry[name as PaymentProviderName];
}

/** What the client may offer; unconfigured providers stay hidden. */
export function listProviders() {
	return Object.values(registry).map((provider) => ({
		name: provider.name,
		currencies: provider.currencies,
		configured: provider.isConfigured(),
	}));
}
