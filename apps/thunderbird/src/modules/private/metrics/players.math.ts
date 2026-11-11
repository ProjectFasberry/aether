/**
 * Hourly balance of joins minus quits. It approximates the peak concurrency:
 * ordering inside an hour is not preserved, which is fine for a dashboard.
 */
export function peakOnline(series: { joins: number; quits: number }[]): number {
	let balance = 0;
	let peak = 0;

	for (const point of series) {
		// A quit without a matching join in the window must not go negative.
		balance = Math.max(0, balance + point.joins - point.quits);
		peak = Math.max(peak, balance);
	}

	return peak;
}
