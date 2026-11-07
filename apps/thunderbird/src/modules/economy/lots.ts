export type SpendableLot = {
	id: number;
	kind: string;
	remaining: number | string;
	created_at: string | Date;
};

export type LotPlan = {
	allocations: Array<{ lotId: number; amount: number }>;
	remaining: number;
};

function lotTime(lot: SpendableLot): number {
	const value = lot.created_at instanceof Date
		? lot.created_at.getTime()
		: Date.parse(lot.created_at);

	return Number.isNaN(value) ? 0 : value;
}

/**
 * Top-up lots are consumed first, then rewards/adjustments, oldest first in
 * each group. The result is pure so the FIFO policy is unit-testable without
 * a database.
 */
export function planLotConsumption(lots: SpendableLot[], amount: number): LotPlan {
	let left = Math.max(0, amount);
	const allocations: Array<{ lotId: number; amount: number }> = [];

	const sorted = [...lots].sort((a, b) => {
		const aTopup = a.kind === "topup" ? 0 : 1;
		const bTopup = b.kind === "topup" ? 0 : 1;
		if (aTopup !== bTopup) return aTopup - bTopup;

		const time = lotTime(a) - lotTime(b);
		if (time !== 0) return time;

		return a.id - b.id;
	});

	for (const lot of sorted) {
		if (left <= 0) break;

		const available = Number(lot.remaining);
		if (!Number.isFinite(available) || available <= 0) continue;

		const take = Math.min(available, left);
		allocations.push({ lotId: lot.id, amount: take });
		left -= take;
	}

	return { allocations, remaining: left };
}
