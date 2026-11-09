/**
 * Pure helpers shared by the reconciliation reports. Wallet keys are
 * `<CURRENCY>:<lowercase nickname>`: the ledger stores the currency uppercase
 * and nicknames are case-insensitive.
 */
export function walletKey(currency: string, nickname: string): string {
	return `${currency.toUpperCase()}:${nickname.toLowerCase()}`;
}

/** Key of a pending projection job; `null` when the payload is not one. */
export function projectionKey(payload: unknown): string | null {
	if (!payload || typeof payload !== "object") return null;

	const { nickname, currency } = payload as { nickname?: unknown; currency?: unknown };
	if (typeof nickname !== "string" || typeof currency !== "string") return null;

	return walletKey(currency, nickname);
}

export function sumByCurrency(rows: { currency: string; amount: string }[]): Record<string, number> {
	const result: Record<string, number> = {};
	for (const row of rows) result[row.currency] = Number(row.amount);
	return result;
}
