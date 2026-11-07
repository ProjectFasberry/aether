import { general } from "#/shared/database/general-db";
import { logErrorMsg } from "#/utils/config/log-utils";
import type { DB } from "@gen/db/general";
import { sql, type Kysely } from "kysely";

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
	status: "pending" | "processing" | "done" | "failed";
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

export async function enqueueGrantJob(
	{
		orderId,
		kind,
		payload,
		runAfter,
	}: {
		orderId: string;
		kind: string;
		payload: Record<string, unknown>;
		runAfter?: Date;
	},
	executor: any = db,
): Promise<void> {
	await executor
		.insertInto("grant_jobs")
		.values({
			order_id: orderId,
			kind,
			payload,
			run_after: runAfter ?? new Date(),
		})
		.onConflict((oc: any) => oc.columns(["order_id", "kind"]).doNothing())
		.execute();
}

/** Retry loop for the outbox; called by the cron job every minute. */
export async function processGrantJobs(limit = 50): Promise<{ processed: number; failed: number }> {
	// A process that died while handling a job leaves it in `processing`. The
	// lease is 15 minutes, long enough for a plugin write, short enough to retry.
	await db
		.updateTable("grant_jobs")
		.set({ status: "pending", updated_at: new Date() })
		.where("status", "=", "processing")
		.where("updated_at", "<", new Date(Date.now() - 15 * 60 * 1000))
		.execute();

	// Claim atomically: two cron ticks or a cron plus the post-checkout trigger
	// must not process the same job at the same time.
	const claimed = await sql<GrantJobRow>`
		UPDATE "grant_jobs"
		SET "status" = 'processing',
		    "updated_at" = now(),
		    "run_after" = now() + interval '15 minutes'
		WHERE "id" IN (
			SELECT "id" FROM "grant_jobs"
			WHERE "status" = 'pending' AND "run_after" <= now()
			ORDER BY "run_after" ASC
			LIMIT ${limit}
			FOR UPDATE SKIP LOCKED
		)
		RETURNING *
	`.execute(db);

	const jobs = claimed.rows as GrantJobRow[];

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
			const maxAttempts = 10;
			const giveUp = attempts >= maxAttempts;

			if (giveUp) failed += 1;

			logErrorMsg(error, { subject: `grant-jobs:${job.kind}` });

			if (giveUp && job.kind === "store.fulfillment") {
				// Keep the per-child state honest before the rollback: the panel
				// must show which items were not delivered.
				await (db as any)
					.updateTable("payments_game_childs")
					.set({
						delivery_status: "failed",
						last_error: error instanceof Error ? error.message : String(error),
					})
					.where("order_id", "=", job.order_id)
					.where("delivery_status", "in", ["pending", "failed"])
					.execute()
					.catch((e: unknown) => logErrorMsg(e, { subject: "store-child-failed" }));

				// The money must not stay with the project when the item was never
				// delivered: compensate through the ledger.
				await enqueueGrantJob({
					orderId: job.order_id,
					kind: "store.rollback",
					payload: {
						orderId: job.order_id,
						reason: error instanceof Error ? error.message : String(error),
					},
				}).catch((e) => logErrorMsg(e, { subject: "store-rollback-enqueue" }));
			}

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
