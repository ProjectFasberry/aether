import { general } from "#/shared/database/general-db";
import type { GrantJobs, JsonValue } from "@gen/db/general";
import type { Selectable } from "kysely";
import type { EconomyTrx } from "./wallet.model";
import { logErrorMsg } from "#/utils/config/log-utils";
import { sql } from "kysely";

/**
 * Outbox for work that must survive a failed attempt: projecting a wallet
 * balance into a plugin table or running the non-money part of an order.
 */
export type GrantJobRow = Omit<Selectable<GrantJobs>, "payload"> & {
	payload: Record<string, unknown>;
};

type GrantHandler = (payload: Record<string, unknown>, job: GrantJobRow) => Promise<void>;

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
	executor: typeof general | EconomyTrx = general,
): Promise<void> {
	await executor
		.insertInto("grant_jobs")
		.values({
			order_id: orderId,
			kind,
			payload: payload as JsonValue,
			run_after: runAfter ?? new Date(),
		})
		.onConflict((oc) => oc.columns(["order_id", "kind"]).doNothing())
		.execute();
}

export const GRANT_JOB_MAX_ATTEMPTS = 10;

/** Exponential backoff capped at five minutes. */
export function grantJobDelayMs(attempts: number): number {
	return Math.min(2 ** attempts, 300) * 1000;
}

export function isFinalGrantAttempt(attempts: number, maxAttempts = GRANT_JOB_MAX_ATTEMPTS): boolean {
	return attempts >= maxAttempts;
}

/** Retry loop for the outbox; called by the cron job every minute. */
export async function processGrantJobs(limit = 50): Promise<{ processed: number; failed: number }> {
	// A process that died while handling a job leaves it in `processing`. The
	// lease is 15 minutes, long enough for a plugin write, short enough to retry.
	await general
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
	`.execute(general);

	const jobs = claimed.rows;

	let failed = 0;

	for (const job of jobs) {
		const handler = handlers.get(job.kind);

		try {
			if (!handler) throw new Error(`UNKNOWN_GRANT_KIND:${job.kind}`);

			await handler(job.payload, job);

			await general
				.updateTable("grant_jobs")
				.set({ status: "done", updated_at: new Date(), last_error: null })
				.where("id", "=", job.id)
				.execute();
		} catch (error) {
			const attempts = job.attempts + 1;
			// Store delivery waits for the game server; keep trying much longer
			// than a projection retry.
			const giveUp = isFinalGrantAttempt(attempts);

			if (giveUp) failed += 1;

			logErrorMsg(error, { subject: `grant-jobs:${job.kind}` });

			if (giveUp && job.kind === "store.fulfillment") {
				// Keep the per-child state honest before the rollback: the panel
				// must show which items were not delivered.
				await general
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

			await general
				.updateTable("grant_jobs")
				.set({
					attempts,
					status: giveUp ? "failed" : "pending",
					last_error: error instanceof Error ? error.message : String(error),
					run_after: new Date(Date.now() + grantJobDelayMs(attempts)),
					updated_at: new Date(),
				})
				.where("id", "=", job.id)
				.execute();
		}
	}

	return { processed: jobs.length, failed };
}
