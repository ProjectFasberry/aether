const BASE_NAK_DELAY_MS = 1_000;
const MAX_NAK_DELAY_MS = 60_000;

/** Exponential redelivery delay, capped so a poison message cannot spin. */
export function nakDelayMs(deliveryCount: number): number {
	const attempt = Math.max(1, Math.floor(deliveryCount));
	return Math.min(BASE_NAK_DELAY_MS * 2 ** (attempt - 1), MAX_NAK_DELAY_MS);
}

export function shouldDeadLetter(deliveryCount: number, maxDeliver: number): boolean {
	return deliveryCount >= maxDeliver;
}
