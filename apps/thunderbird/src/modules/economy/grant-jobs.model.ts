import { general } from "#/shared/database/general-db";
import { logErrorMsg } from "#/utils/config/log-utils";
import type { DB } from "@gen/db/general";
import type { Kysely } from "kysely";

/**
 * Outbox for work that must survive a failed attempt: projecting a wallet
 * balance into a plugin table or running the non-money part of an order.
 *
 * The table predates the generated `DB` type, so its Kysely surface stays
 * untyped here.
 */
export type GrantJobRow = {
	id: number;
	order_id: string;
	kind: string;
	payload: Record<string, unknown>;
	status: "pending" | "done" | "failed";
	attempts: number;
	last_error: string | null;
	run_after: Date;
	created_at: Date;
	updated_at: Date;
};

type GrantHandler = (payload: Record<string, any>, job: GrantJobRow) => Promise<void>;

const db = general as unknown as Kysely<DB & { grant_jobs: any }>;

const handlers = new Map<string, GrantHandler>();

/** Registered once per job kind by the module that owns the effect. */
export function registerGrantHandler(kind: string, handler: GrantHandler): void {
	handlers.set(kind, handler);
}

export async function enqueueGrantJob({
	orderId,
	kind,
	payload,
	runAfter,
}: {
	orderId: string;
	kind: string;
	payload: Record<string, unknown>;
	runAfter?: Date;
}): Promise<void> {
	await db
		.insertInto("grant_jobs")
		.values({
			order_id: orderId,
			kind,
			payload,
			run_after: runAfter ?? new Date(),
		})
		.onConflict((oc) => oc.columns(["order_id", "kind"]).doNothing())
		.execute();
}

/** Retry loop for the outbox; called by the cron job every minute. */
export async function processGrantJobs(limit = 50): Promise<{ processed: number; failed: number }> {
	const jobs = (await db
		.selectFrom("grant_jobs")
		.selectAll()
		.where("status", "=", "pending")
		.where("run_after", "<=", new Date())
		.orderBy("run_after", "asc")
		.limit(limit)
		.execute()) as unknown as GrantJobRow[];

	let failed = 0;

	for (const job of jobs) {
		const handler = handlers.get(job.kind);

		try {
			if (!handler) throw new Error(`UNKNOWN_GRANT_KIND:${job.kind}`);

			await handler(job.payload, job);

			await db
				.updateTable("grant_jobs")
				.set({ status: "done", updated_at: new Date(), last_error: null })
				.where("id", "=", job.id)
				.execute();
		} catch (error) {
			const attempts = job.attempts + 1;
			// Store delivery waits for the game server; keep trying much longer
			// than a projection retry.
			const maxAttempts = job.kind === "store.fulfillment" ? 200 : 10;
			const giveUp = attempts >= maxAttempts;

			if (giveUp) failed += 1;

			logErrorMsg(error, { subject: `grant-jobs:${job.kind}` });

			await db
				.updateTable("grant_jobs")
				.set({
					attempts,
					status: giveUp ? "failed" : "pending",
					last_error: error instanceof Error ? error.message : String(error),
					run_after: new Date(Date.now() + Math.min(2 ** attempts, 300) * 1000),
					updated_at: new Date(),
				})
				.where("id", "=", job.id)
				.execute();
		}
	}

	return { processed: jobs.length, failed };
}
