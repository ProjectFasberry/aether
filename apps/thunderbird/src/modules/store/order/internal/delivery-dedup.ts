import { GAME_CURRENCIES, type GameCurrency } from "@repo/shared/schemas/store/payment";

/**
 * A LuckPerms effect resolved from a store item or a command template.
 *
 * `expiry` is epoch seconds, 0 means permanent. `contexts` never contains
 * `server` and `world`: LuckPerms stores those in separate columns.
 */
export type DeliveryEffect = {
	permission: string;
	value: boolean;
	world: string;
	server: string;
	contexts: Record<string, string>;
	expiry: number;
};

export type DeliveryEffectNode = {
	permission: string;
	value: boolean;
	world: string | null;
	server: string | null;
	contexts: string | null;
	expiry: number | string | bigint | null;
};

export type DeliveryProduct = {
	id?: number;
	title?: string;
	recipient: string;
	type?: string | null;
	value?: string | null;
	command?: string | null;
	price?: string | number | null;
	currency?: string | null;
};

export type DeliveryCheck = {
	effect: DeliveryEffect | null;
	duplicate: boolean;
	uuid?: string | null;
	existing?: DeliveryEffectNode;
};

export type SkippedItem = {
	id: number;
	title: string;
	recipient: string;
	reason: "PERMISSION_ALREADY_PRESENT";
};

const GLOBAL_SCOPE = "global";

function normalizeScope(value: string | null | undefined): string {
	if (!value || value === "*") return GLOBAL_SCOPE;
	return value;
}

export function parseContexts(raw: string | null | undefined): Record<string, string> {
	if (!raw) return {};

	try {
		const parsed = JSON.parse(raw) as unknown;

		if (Array.isArray(parsed)) {
			return Object.fromEntries(
				parsed
					.filter((entry): entry is { key: string; value: unknown } => (
						typeof entry === "object" && entry !== null
						&& typeof (entry as { key?: unknown }).key === "string"
					))
					.map((entry) => [entry.key, String(entry.value)]),
			);
		}

		if (typeof parsed === "object" && parsed !== null) {
			return Object.fromEntries(
				Object.entries(parsed).map(([key, value]) => [key, String(value)]),
			);
		}
	} catch {
		// A broken row is treated as an empty context set: the caller will
		// simply not consider it a duplicate.
	}

	return {};
}

function contextEntries(contexts: Record<string, string>): Array<[string, string]> {
	return Object.entries(contexts).filter(([key]) => key !== "server" && key !== "world");
}

/**
 * `existing` covers `requested` when every context required by the existing
 * node is also required by the requested one. An empty context set is global.
 */
export function contextsCover(
	existing: Record<string, string>,
	requested: Record<string, string>,
): boolean {
	for (const [key, value] of contextEntries(existing)) {
		if (requested[key] !== value) return false;
	}

	return true;
}

export function effectCovers(existing: DeliveryEffect, requested: DeliveryEffect): boolean {
	return nodeCovers({
		...existing,
		contexts: JSON.stringify(existing.contexts),
	}, requested);
}

export function nodeCovers(existing: DeliveryEffectNode, requested: DeliveryEffect): boolean {
	if (!existing.value) return false;
	if (existing.permission !== requested.permission) return false;

	const existingWorld = normalizeScope(existing.world);
	const existingServer = normalizeScope(existing.server);

	if (existingWorld !== GLOBAL_SCOPE && existingWorld !== normalizeScope(requested.world)) return false;
	if (existingServer !== GLOBAL_SCOPE && existingServer !== normalizeScope(requested.server)) return false;

	if (!contextsCover(parseContexts(existing.contexts), requested.contexts)) return false;

	const existingExpiry = Number(existing.expiry ?? 0);
	if (existingExpiry !== 0) {
		if (requested.expiry === 0) return false;
		if (existingExpiry < requested.expiry) return false;
	}

	return true;
}

function renderTemplate(template: string, values: Record<string, string>): string {
	return template.replace(/\{(recipient|value)\}/g, (_, key: string) => values[key] ?? "");
}

/**
 * Parses only the structured `lp user <name> parent add|set <group>` form.
 * Arbitrary console commands are not treated as deliverable permissions: they
 * still run, but the deduplication check is skipped for them.
 */
export function parseLuckPermsParentCommand(
	command: string,
	recipient: string,
): DeliveryEffect | null {
	const tokens = renderTemplate(command, { recipient }).trim().replace(/^\//, "").split(/\s+/);

	if (tokens.length < 6) return null;
	if (tokens[0]?.toLowerCase() !== "lp") return null;
	if (tokens[1]?.toLowerCase() !== "user") return null;
	if (tokens[3]?.toLowerCase() !== "parent") return null;

	const action = tokens[4]?.toLowerCase();
	if (action !== "add" && action !== "set") return null;

	const group = tokens[5];
	if (!group || group.startsWith("{") || group.startsWith("%")) return null;

	let world = GLOBAL_SCOPE;
	let server = GLOBAL_SCOPE;
	const contexts: Record<string, string> = {};

	for (const token of tokens.slice(6)) {
		const separator = token.indexOf("=");
		if (separator <= 0) continue;

		const key = token.slice(0, separator);
		const value = token.slice(separator + 1);
		if (!value || value.startsWith("{") || value.startsWith("%")) return null;

		if (key === "server") server = normalizeScope(value);
		else if (key === "world") world = normalizeScope(value);
		else contexts[key] = value;
	}

	return {
		permission: group.startsWith("group.") ? group : `group.${group}`,
		value: true,
		world,
		server,
		contexts,
		expiry: 0,
	};
}

export function resolveDeliveryEffect(product: DeliveryProduct): DeliveryEffect | null {
	if (product.command) {
		return parseLuckPermsParentCommand(product.command, product.recipient);
	}

	if (product.type === "donate" && product.value) {
		return {
			permission: `group.${product.value}`,
			value: true,
			world: GLOBAL_SCOPE,
			server: GLOBAL_SCOPE,
			contexts: {},
			expiry: 0,
		};
	}

	return null;
}

export function parseEffectSnapshot(raw: unknown): DeliveryEffect | null {
	if (!raw) return null;

	let value: unknown = raw;
	if (typeof value === "string") {
		try {
			value = JSON.parse(value) as unknown;
		} catch {
			return null;
		}
	}

	if (typeof value !== "object" || value === null) return null;

	const effect = value as Partial<DeliveryEffect>;
	if (typeof effect.permission !== "string" || effect.permission.length === 0) return null;

	return {
		permission: effect.permission,
		value: effect.value ?? true,
		world: normalizeScope(effect.world),
		server: normalizeScope(effect.server),
		contexts: effect.contexts ?? {},
		expiry: Number(effect.expiry ?? 0),
	};
}

export function sumProductsPrice(products: DeliveryProduct[]): Record<GameCurrency, number> {
	const price = Object.fromEntries(GAME_CURRENCIES.map((currency) => [currency, 0])) as Record<GameCurrency, number>;

	for (const product of products) {
		const currency = product.currency as GameCurrency | null | undefined;
		if (!currency || !GAME_CURRENCIES.includes(currency)) continue;

		price[currency] += Number(product.price ?? 0);
	}

	return price;
}

export function partitionProducts(
	products: DeliveryProduct[],
	checks: Map<number, DeliveryCheck>,
): { deliverable: DeliveryProduct[]; skipped: SkippedItem[] } {
	const deliverable: DeliveryProduct[] = [];
	const skipped: SkippedItem[] = [];

	products.forEach((product, index) => {
		if (!checks.get(index)?.duplicate) {
			deliverable.push(product);
			return;
		}

		skipped.push({
			id: product.id ?? 0,
			title: product.title ?? "",
			recipient: product.recipient,
			reason: "PERMISSION_ALREADY_PRESENT",
		});
	});

	return { deliverable, skipped };
}

export function deliveryLockKey(recipient: string, effect: DeliveryEffect): string {
	return `${recipient.toLowerCase()}:${effect.permission}`;
}

export function deliveryLockKeys(products: DeliveryProduct[]): string[] {
	return products.flatMap((product) => {
		const effect = resolveDeliveryEffect(product);
		return effect ? [deliveryLockKey(product.recipient, effect)] : [];
	});
}
