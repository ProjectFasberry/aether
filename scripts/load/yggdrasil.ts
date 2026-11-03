#!/usr/bin/env bun
/**
 * Load generator for the join path: launcher login -> join ticket -> game token
 * -> Yggdrasil `join` -> `hasJoined` (what the proxy does).
 *
 * Usage:
 *   API=https://api.fasberry.fun \
 *   ACCOUNTS="steve:secret,alex:secret" \
 *   CONCURRENCY=32 ROUNDS=3 \
 *   bun scripts/load/yggdrasil.ts
 *
 * Every virtual user must use its own account: `/auth/client/login` drops the
 * other launcher sessions of the same account, so two workers on one nickname
 * would invalidate each other.
 *
 * Exit code 1 means the run broke a budget (error rate / p95); see the summary.
 */

type Step =
  | "login"
  | "ticket"
  | "authenticate"
  | "join"
  | "hasJoined"
  | "invalidate";

type Samples = Record<Step, number[]>;
type Failures = Record<Step, { rateLimited: number; statuses: Map<number | string, number> }>;

const API = (process.env.API ?? "https://api.fasberry.fun").replace(/\/$/, "");
const CONCURRENCY = Number(process.env.CONCURRENCY ?? 32);
const ROUNDS = Number(process.env.ROUNDS ?? 1);
const SERVER = process.env.SERVER ?? "lobby";
const TIMEOUT_MS = Number(process.env.TIMEOUT_MS ?? 10_000);
const MAX_ERROR_RATE = Number(process.env.MAX_ERROR_RATE ?? 0.01);
const MAX_P95_MS = Number(process.env.MAX_P95_MS ?? 800);

const accounts = (process.env.ACCOUNTS ?? "")
  .split(",")
  .map((entry) => entry.trim())
  .filter(Boolean)
  .map((entry) => {
    const index = entry.indexOf(":");

    if (index < 1) throw new Error(`ACCOUNTS entries must be nickname:password, got "${entry}"`);

    return { nickname: entry.slice(0, index), password: entry.slice(index + 1) };
  });

if (accounts.length === 0) {
  console.error("ACCOUNTS=nick:pass[,nick:pass...] is required");
  process.exit(2);
}

if (accounts.length < CONCURRENCY) {
  console.warn(
    `[load] ${CONCURRENCY} workers but only ${accounts.length} accounts: workers share accounts and invalidate each other`,
  );
}

const STEPS: Step[] = ["login", "ticket", "authenticate", "join", "hasJoined", "invalidate"];

function fresh(): Samples {
  return Object.fromEntries(STEPS.map((step) => [step, []])) as Samples;
}

function freshFailures(): Failures {
  return Object.fromEntries(
    STEPS.map((step) => [step, { rateLimited: 0, statuses: new Map<number | string, number>() }]),
  ) as Failures;
}

const samples = fresh();
const failures = freshFailures();

function record(step: Step, ms: number) {
  samples[step].push(ms);
}

function fail(step: Step, status: number | string) {
  const bucket = failures[step];

  if (status === 429) bucket.rateLimited += 1;

  bucket.statuses.set(status, (bucket.statuses.get(status) ?? 0) + 1);
}

async function call(
  step: Step,
  path: string,
  init: RequestInit,
  expected: number[] = [200],
): Promise<{ status: number; body: unknown; text: string }> {
  const started = performance.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(`${API}${path}`, { ...init, signal: controller.signal });
    const text = await response.text();
    let body: unknown = null;

    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = null;
    }

    record(step, performance.now() - started);

    if (!expected.includes(response.status)) {
      fail(step, response.status);

      return { status: response.status, body, text };
    }

    return { status: response.status, body, text };
  } catch (error) {
    record(step, performance.now() - started);
    fail(step, error instanceof Error ? error.name : "network");

    return { status: 0, body: null, text: String(error) };
  } finally {
    clearTimeout(timer);
  }
}

const json = (payload: unknown): RequestInit => ({
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(payload),
});

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

/** One full join cycle for one account. */
async function virtualUser(index: number) {
  const account = accounts[index % accounts.length];
  const suffix = `${index}-${Math.random().toString(16).slice(2, 10)}`;

  const login = await call("login", "/auth/client/login", json(account));
  const token = (login.body as { data?: { token?: string } } | null)?.data?.token;

  if (!token) return;

  const ticket = await call(
    "ticket",
    "/launcher/session/ticket",
    { ...json({ server: SERVER }), headers: { "content-type": "application/json", authorization: `Bearer ${token}` } },
    [200],
  );

  if (ticket.status !== 200) return;

  const game = await call(
    "authenticate",
    "/yggdrasil/authserver/authenticate",
    { ...json({}), headers: { "content-type": "application/json", authorization: `Bearer ${token}` } },
    [200],
  );

  const selected = (game.body as { accessToken?: string; selectedProfile?: { id?: string } } | null) ?? {};
  const accessToken = selected.accessToken;
  const profileId = selected.selectedProfile?.id;

  if (!accessToken || !profileId) return;

  const serverId = `load-${suffix}`;

  const join = await call(
    "join",
    "/yggdrasil/sessionserver/session/minecraft/join",
    json({ accessToken, selectedProfile: profileId, serverId }),
    [204],
  );

  if (join.status !== 204) {
    await call("invalidate", "/yggdrasil/authserver/invalidate", json({ accessToken }), [204]);
    return;
  }

  await call(
    "hasJoined",
    `/yggdrasil/sessionserver/session/minecraft/hasJoined?username=${encodeURIComponent(account.nickname)}&serverId=${encodeURIComponent(serverId)}`,
    { method: "GET" },
    [200],
  );

  await call("invalidate", "/yggdrasil/authserver/invalidate", json({ accessToken }), [204]);
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;

  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);

  return sorted[index]!;
}

function ms(value: number): string {
  return `${value.toFixed(0)}ms`.padStart(8);
}

function summary(): { errorRate: number; p95: number } {
  console.log(`\n${API}  workers=${CONCURRENCY}  rounds=${ROUNDS}  accounts=${accounts.length}`);
  console.log(
    "step         count   p50      p95      p99      max      errors   429",
  );

  let total = 0;
  let errors = 0;
  let worstP95 = 0;

  for (const step of STEPS) {
    const values = samples[step];
    const failed = [...failures[step].statuses.values()].reduce((sum, value) => sum + value, 0);

    total += values.length;
    errors += failed;
    worstP95 = Math.max(worstP95, percentile(values, 95));

    console.log(
      `${step.padEnd(11)} ${String(values.length).padStart(6)} ${ms(percentile(values, 50))} ${ms(percentile(values, 95))} ${ms(percentile(values, 99))} ${ms(Math.max(0, ...values))} ${String(failed).padStart(8)} ${String(failures[step].rateLimited).padStart(5)}`,
    );

    if (failures[step].statuses.size > 0) {
      const detail = [...failures[step].statuses.entries()]
        .map(([status, count]) => `${status}=${count}`)
        .join(", ");

      console.log(`  ${step}: ${detail}`);
    }
  }

  const errorRate = total === 0 ? 1 : errors / total;

  console.log(
    `\nerrors: ${plural(errors, "failed call")} of ${total} (${(errorRate * 100).toFixed(2)}%), worst p95 ${worstP95.toFixed(0)}ms`,
  );
  console.log(`budgets: error rate <= ${(MAX_ERROR_RATE * 100).toFixed(2)}%, p95 <= ${MAX_P95_MS}ms`);

  return { errorRate, p95: worstP95 };
}

const startedAt = performance.now();
let next = 0;

async function worker() {
  for (let round = 0; round < ROUNDS; round += 1) {
    const index = next;
    next += 1;

    await virtualUser(index);
  }
}

await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

const result = summary();

console.log(`wall clock: ${((performance.now() - startedAt) / 1000).toFixed(1)}s`);

if (result.errorRate > MAX_ERROR_RATE || result.p95 > MAX_P95_MS) {
  console.error("\nFAILED: budgets exceeded");
  process.exit(1);
}

console.log("\nOK: budgets met");
