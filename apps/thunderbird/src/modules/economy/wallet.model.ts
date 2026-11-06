import { general } from "#/shared/database/general-db";
import { playerpoints } from "#/shared/database/playerpoints-db";
import { bisquite } from "#/shared/database/bisquite-db";
import { logErrorMsg } from "#/utils/config/log-utils";
import type { DB } from "@gen/db/general";
import type { Kysely } from "kysely";

export const CURRENCIES = ["BELKOIN", "CHARISM"] as const;
export type Currency = typeof CURRENCIES[number];

/**
 * The new tables are additive and not part of the generated `DB` type yet.
 * Their Kysely surface is `any` on purpose: the generated schema is refreshed
 * separately, while the service keeps its own row types below.
 */
type EconomyDB = {
  wallets: any;
  ledger_entries: any;
  grant_jobs: any;
};

type LedgerRow = {
  id: number;
  nickname: string;
  currency: string;
  delta: number;
  balance_after: number;
  reason: string;
  order_id: string | null;
  actor: string | null;
  metadata: unknown;
  created_at: Date;
};

type GrantJobRow = {
  id: number;
  order_id: string;
  kind: string;
  payload: { nickname: string; currency: Currency; balance: number };
  status: string;
  attempts: number;
  last_error: string | null;
  run_after: Date;
  created_at: Date;
  updated_at: Date;
};

const db = general as unknown as Kysely<DB & EconomyDB>;

export type LedgerEntry = LedgerRow;
export type ApplyResult = { balance: number; entry: LedgerRow; duplicate: boolean };

type ApplyInput = {
  nickname: string;
  currency: Currency;
  delta: number;
  reason: string;
  orderId?: string | null;
  actor?: string | null;
  metadata?: Record<string, unknown>;
};

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: string }).code === "23505";
}

async function pluginBalance(nickname: string, currency: Currency): Promise<number> {
  if (currency === "BELKOIN") {
    const row = await playerpoints
      .selectFrom("playerpoints_points")
      .innerJoin("playerpoints_username_cache", "playerpoints_username_cache.uuid", "playerpoints_points.uuid")
      .select("playerpoints_points.points as balance")
      .where("playerpoints_username_cache.username", "=", nickname)
      .executeTakeFirst();

    return Number(row?.balance ?? 0);
  }

  const row = await bisquite
    .selectFrom("cmi_users")
    .select("Balance as balance")
    .where("username", "=", nickname)
    .executeTakeFirst();

  return Number(row?.balance ?? 0);
}

/**
 * The wallet is the source of truth once it exists. Players who have not been
 * migrated yet fall back to the plugin table, so a deploy does not hide their
 * balance before the one-off migration runs.
 */
export async function getBalance(nickname: string, currency: Currency): Promise<number> {
  const wallet = await db
    .selectFrom("wallets")
    .select("balance")
    .where("nickname", "=", nickname)
    .where("currency", "=", currency)
    .executeTakeFirst();

  if (wallet) return Number(wallet.balance);

  return pluginBalance(nickname, currency);
}

export async function getWallet(nickname: string): Promise<Record<Currency, number>> {
  const [BELKOIN, CHARISM] = await Promise.all([
    getBalance(nickname, "BELKOIN"),
    getBalance(nickname, "CHARISM"),
  ]);

  return { BELKOIN, CHARISM };
}

export async function getHistory(nickname: string, limit = 50): Promise<LedgerEntry[]> {
  return db
    .selectFrom("ledger_entries")
    .selectAll()
    .where("nickname", "=", nickname)
    .orderBy("created_at", "desc")
    .orderBy("id", "desc")
    .limit(limit)
    .execute() as unknown as Promise<LedgerEntry[]>;
}

/**
 * Applies one signed change to a wallet and records it in the ledger.
 *
 * The wallet row is locked while the balance is read, so two concurrent
 * purchases cannot both see the old balance. `(order_id, reason)` makes the
 * business operation idempotent: a retry returns the first entry instead of
 * moving money twice.
 */
export async function apply(input: ApplyInput): Promise<ApplyResult> {
  const { nickname, currency, delta, reason, orderId = null, actor = null, metadata = {} } = input;

  if (delta === 0) {
    throw new Error("ZERO_DELTA");
  }

  try {
    const result = await db.transaction().execute(async (trx) => {
      if (orderId) {
        const existing = await trx
          .selectFrom("ledger_entries")
          .selectAll()
          .where("order_id", "=", orderId)
          .where("reason", "=", reason)
          .executeTakeFirst() as unknown as LedgerRow | undefined;

        if (existing) return { entry: existing, duplicate: true };
      }

      await trx
        .insertInto("wallets")
        .values({ nickname, currency, balance: 0 })
        .onConflict((oc) => oc.columns(["nickname", "currency"]).doNothing())
        .execute();

      const wallet = await trx
        .selectFrom("wallets")
        .select("balance")
        .where("nickname", "=", nickname)
        .where("currency", "=", currency)
        .forUpdate()
        .executeTakeFirstOrThrow();

      const balance = Number(wallet.balance) + delta;
      if (balance < 0) throw new Error("INSUFFICIENT_FUNDS");

      await trx
        .updateTable("wallets")
        .set({ balance, updated_at: new Date() })
        .where("nickname", "=", nickname)
        .where("currency", "=", currency)
        .execute();

      const entry = await trx
        .insertInto("ledger_entries")
        .values({
          nickname,
          currency,
          delta,
          balance_after: balance,
          reason,
          order_id: orderId,
          actor,
          metadata,
        })
        .returningAll()
        .executeTakeFirstOrThrow() as unknown as LedgerRow;

      return { entry, duplicate: false };
    });

    if (!result.duplicate) {
      await syncOrEnqueue(result.entry, orderId);
    }

    return { balance: Number(result.entry.balance_after), entry: result.entry, duplicate: result.duplicate };
  } catch (error) {
    // Two concurrent retries of the same operation: one wins the unique index,
    // the other reads the winning row.
    if (orderId && isUniqueViolation(error)) {
      const existing = await db
        .selectFrom("ledger_entries")
        .selectAll()
        .where("order_id", "=", orderId)
        .where("reason", "=", reason)
        .executeTakeFirst() as unknown as LedgerRow | undefined;

      if (existing) {
        return { balance: Number(existing.balance_after), entry: existing, duplicate: true };
      }
    }

    throw error;
  }
}

export function credit(
  nickname: string,
  currency: Currency,
  amount: number,
  options: Omit<ApplyInput, "nickname" | "currency" | "delta">,
): Promise<ApplyResult> {
  return apply({ ...options, nickname, currency, delta: Math.abs(amount) });
}

export function debit(
  nickname: string,
  currency: Currency,
  amount: number,
  options: Omit<ApplyInput, "nickname" | "currency" | "delta">,
): Promise<ApplyResult> {
  return apply({ ...options, nickname, currency, delta: -Math.abs(amount) });
}

/** Writes the balance to the plugin table the game servers read. */
async function syncProjection(nickname: string, currency: Currency, balance: number): Promise<void> {
  if (currency === "BELKOIN") {
    const account = await general
      .selectFrom("accounts")
      .select("uuid")
      .where("lower_nickname", "=", nickname.toLowerCase())
      .executeTakeFirst();

    if (!account) throw new Error("ACCOUNT_NOT_FOUND");

    await playerpoints
      .insertInto("playerpoints_points")
      .values({ uuid: account.uuid, points: balance })
      .onDuplicateKeyUpdate({ points: balance })
      .execute();
  } else {
    const updated = await bisquite
      .updateTable("cmi_users")
      .set({ Balance: balance })
      .where("username", "=", nickname)
      .executeTakeFirst();

    // CMI creates its row on the first join; until then the ledger keeps the
    // balance and the outbox retries the projection.
    if (Number(updated.numUpdatedRows ?? 0) === 0) throw new Error("CMI_PLAYER_NOT_FOUND");
  }
}

async function syncOrEnqueue(entry: LedgerRow, orderId: string | null): Promise<void> {
  const nickname = entry.nickname;
  const currency = entry.currency as Currency;
  const balance = Number(entry.balance_after);

  try {
    await syncProjection(nickname, currency, balance);
  } catch (error) {
    logErrorMsg(error);

    await db
      .insertInto("grant_jobs")
      .values({
        order_id: orderId ?? `ledger:${entry.id}`,
        kind: currency,
        payload: { nickname, currency, balance },
      })
      .onConflict((oc) => oc.columns(["order_id", "kind"]).doNothing())
      .execute();
  }
}

/** Retry loop for projections that failed; called by the cron job. */
export async function processGrantJobs(limit = 50): Promise<number> {
  const jobs = await db
    .selectFrom("grant_jobs")
    .selectAll()
    .where("status", "=", "pending")
    .where("run_after", "<=", new Date())
    .orderBy("run_after", "asc")
    .limit(limit)
    .execute() as unknown as GrantJobRow[];

  for (const job of jobs) {
    try {
      const { nickname, currency, balance } = job.payload;
      await syncProjection(nickname, currency, balance);

      await db
        .updateTable("grant_jobs")
        .set({ status: "done", updated_at: new Date(), last_error: null })
        .where("id", "=", job.id)
        .execute();
    } catch (error) {
      const attempts = job.attempts + 1;
      const failed = attempts >= 10;

      await db
        .updateTable("grant_jobs")
        .set({
          attempts,
          status: failed ? "failed" : "pending",
          last_error: error instanceof Error ? error.message : String(error),
          run_after: new Date(Date.now() + Math.min(2 ** attempts, 300) * 1000),
          updated_at: new Date(),
        })
        .where("id", "=", job.id)
        .execute();
    }
  }

  return jobs.length;
}

/**
 * One-off migration: copies the plugin balance into a wallet and records an
 * opening ledger entry. Idempotent through `migration:<nickname>:<currency>`.
 */
export async function migrateWallet(nickname: string, currency: Currency): Promise<ApplyResult | null> {
  const existing = await db
    .selectFrom("ledger_entries")
    .selectAll()
    .where("order_id", "=", `migration:${nickname}:${currency}`)
    .where("reason", "=", "migration")
    .executeTakeFirst();

  if (existing) return null;

  const balance = await pluginBalance(nickname, currency);
  if (balance === 0) return null;

  return apply({
    nickname,
    currency,
    delta: balance,
    reason: "migration",
    orderId: `migration:${nickname}:${currency}`,
    actor: "system",
    metadata: { source: "plugin" },
  });
}
