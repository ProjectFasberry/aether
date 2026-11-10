import { randomUUID } from "node:crypto";
import { natsService } from "#/shared/nats/client"
import { NATS_CONSUMERS, ORDER_MAX_DELIVER } from "#/shared/nats/cons";
import { nakDelayMs, shouldDeadLetter } from "./retry";
import { general } from "#/shared/database/general-db";
import { serverStatusService } from "#/modules/server/status/index.model";
import { getEnv } from "#/shared/env";
import { jetstream } from "@nats-io/jetstream";
import { safeJsonParse } from "@repo/shared/utils";
import { appLogger } from "#/shared/constants/logger";

type CommandType =
  | "lp" // luckperms
  | "sudo" // cmi sudo
  | "cmi" // cmi
  | "p" // player points

export type CommandMeta = {
  /** Stable id used by the game side for idempotency. */
  commandId?: string;
  orderId?: string;
  childId?: number;
  kind?: "delivery" | "revoke";
  /** Player whose current backend should execute the command. */
  recipient?: string;
  /** Backend used when the player is offline. */
  fallbackServer?: string;
  /** Explicit target; skips the presence lookup. */
  server?: string;
  /** Toast/broadcast callers do not need to wait for the game server. */
  wait?: boolean;
};

type CallServerCommand = {
  parent: CommandType,
  value: string
  meta?: CommandMeta
}

type ResponseMsg = {
  result: "ok"
} | {
  error: string
}

type CommandResult = {
  ok: true
} | {
  ok: false;
  error: string
}

type WirePayload = CommandMeta & {
  event?: string;
  command?: string;
  comment?: unknown;
}

export type AbortableCommandArgs = {
  signal: AbortSignal
}

const timeout = 2000
const commandTimeout = 5000
const commandWaiters = new Map<string, Array<{
  resolve: (result: CommandResult) => void;
  timer: NodeJS.Timeout;
}>>();

function resolveCommand(id: string | undefined, result: CommandResult): void {
  if (!id) return;

  const waiters = commandWaiters.get(id);
  if (!waiters) return;

  commandWaiters.delete(id);

  for (const waiter of waiters) {
    clearTimeout(waiter.timer);
    waiter.resolve(result);
  }
}

function waitForCommand(id: string): Promise<CommandResult> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      const waiters = commandWaiters.get(id);
      const remaining = waiters?.filter((waiter) => waiter.timer !== timer) ?? [];

      if (remaining.length > 0) commandWaiters.set(id, remaining);
      else commandWaiters.delete(id);

      resolve({ ok: false, error: "COMMAND_TIMEOUT" });
    }, commandTimeout);

    const waiters = commandWaiters.get(id) ?? [];
    waiters.push({ resolve, timer });
    commandWaiters.set(id, waiters);
  });
}

/**
 * Persists the game-server result on the child. The outbox job may be retried
 * after the API missed the in-process waiter, so the database is the source of
 * truth for delivery/revocation state.
 */
async function markCommandResult(
  payload: WirePayload,
  ok: boolean,
  error?: string,
): Promise<void> {
  const childId = Number(payload.childId);
  if (!Number.isInteger(childId) || childId <= 0) return;

  if (!ok) {
    await general
      .updateTable("payments_game_childs")
      .set({ last_error: error ?? "COMMAND_FAILED" })
      .where("id", "=", childId)
      .execute();

    return;
  }

  if (payload.kind === "revoke") {
    await general
      .updateTable("payments_game_childs")
      .set({
        delivery_status: "revoked",
        revoked_at: new Date(),
        last_error: null,
      })
      .where("id", "=", childId)
      .execute();

    return;
  }

  // A revoke may have won the race while the command was in flight.
  await general
    .updateTable("payments_game_childs")
    .set({
      delivery_status: "delivered",
      delivered_at: new Date(),
      last_error: null,
    })
    .where("id", "=", childId)
    .where("delivery_status", "not in", ["revoked"])
    .execute();
}

const DLQ_SUBJECT = "order.dlq";

/**
 * Stores a poison command for inspection. The original bytes are base64 so a
 * replay does not depend on JSON re-serialization.
 */
async function deadLetter(
  js: ReturnType<typeof jetstream>,
  message: { subject: string; info: { streamSequence: number; deliveryCount: number }; timestamp: string; data: Uint8Array },
  error: string,
): Promise<void> {
  await js.publish(DLQ_SUBJECT, JSON.stringify({
    subject: message.subject,
    streamSequence: message.info.streamSequence,
    deliveryCount: message.info.deliveryCount,
    error,
    receivedAt: message.timestamp,
    payload: Buffer.from(message.data).toString("base64"),
  }));
}

export const startOrderConsumer = async (): Promise<void> => {
  const nc = natsService.getInstance()
  const js = jetstream(nc);

  const orderCons = NATS_CONSUMERS["order"][0]
  const consumer = await js.consumers.get(orderCons.stream_name, orderCons.name);

  const msgs = await consumer.consume({ max_messages: 20, expires: 5000 });

  (async () => {
    try {
      for await (const s of msgs.status()) {
        if (s.type === "heartbeats_missed") {
          appLogger.warn(`${s.count} heartbeats missed`);
          if (s.count === 2) {
            msgs.stop();
          }
        }
      }
    } catch (err) {
      appLogger.error({ message: "Status monitor error", error: err });
    }
  })();

  try {
    for await (const m of msgs) {
      let decoded: WirePayload | undefined;
      let commandSubject = "server.bisquite.command";

      try {
        const payload = m.data;
        const parsed = safeJsonParse<WirePayload>(new TextDecoder().decode(payload));

        if (!parsed.ok) {
          m.ack();
          continue;
        }

        decoded = parsed.value;
        commandSubject = `server.${(decoded.server ?? "bisquite").toLowerCase()}.command`;

        const r = await nc.request(commandSubject, payload, { timeout });
        const res = r.json<ResponseMsg>();

        if ("error" in res) {
          await markCommandResult(decoded, false, res.error);
          resolveCommand(decoded.commandId, { ok: false, error: res.error });
          // A business error is not retryable by redelivering the same message;
          // the outbox decides whether to try again.
          m.ack();
          appLogger.error({ message: "Business error from request", error: res.error });
          continue;
        }

        await markCommandResult(decoded, true);
        resolveCommand(decoded.commandId, { ok: true });
        m.ack();
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        const noResponders = message.toLowerCase().includes("no responders");

        if (noResponders) {
          // A missing command executor is a configuration error, not a transient
          // one. Redelivering it forever would block every later command.
          if (decoded) {
            await markCommandResult(decoded, false, "NO_RESPONDERS").catch(() => undefined);
            resolveCommand(decoded.commandId, { ok: false, error: "NO_RESPONDERS" });
          }

          appLogger.error(`No command executor for ${commandSubject}`);
          m.ack();
          continue;
        }

        appLogger.error({ message: "Failed to process message", error: e });

        if (decoded && shouldDeadLetter(m.info.deliveryCount, ORDER_MAX_DELIVER)) {
          try {
            await deadLetter(js, m, message);
            await markCommandResult(decoded, false, "MAX_DELIVERIES").catch(() => undefined);
            resolveCommand(decoded.commandId, { ok: false, error: "MAX_DELIVERIES" });
            m.term("max deliveries");
          } catch (deadLetterError) {
            appLogger.error({ message: "Failed to dead-letter message", error: deadLetterError });
            m.nak(nakDelayMs(m.info.deliveryCount));
          }

          continue;
        }

        // Back off instead of spinning the same poison message in a hot loop.
        m.nak(nakDelayMs(m.info.deliveryCount));
      }
    }
  } catch (e) {
    appLogger.error({ message: "Consumer loop stopped due to critical error", error: e });
  }
}

/**
 * Only backends with the command executor deployed are allowed. Keep this in
 * sync with the rollout: add "lobby" after its plugin is live.
 */
const ENABLED_COMMAND_SERVERS = ["bisquite", "lobby"] as const;

/**
 * The store lives on a backend; the panel knows which backend currently hosts
 * the player. If the player is offline, use the item's server as a fallback.
 */
export async function resolveTargetServer(recipient?: string, fallback?: string): Promise<string> {
  if (recipient) {
    const status = await serverStatusService.getPlayerStatusGlobal({
      nickname: recipient,
      panelUser: getEnv().PANEL_USER,
      panelPassword: getEnv().PANEL_PASSWORD,
    }).catch(() => null);

    const server = status?.currentServer?.toLowerCase();
    if (server && (ENABLED_COMMAND_SERVERS as readonly string[]).includes(server)) {
      return server;
    }
  }

  const fallbackServer = (fallback ?? "bisquite").toLowerCase();

  return (ENABLED_COMMAND_SERVERS as readonly string[]).includes(fallbackServer)
    ? fallbackServer
    : ENABLED_COMMAND_SERVERS[0];
}

export async function callServerCommand({ parent, value, meta }: CallServerCommand): Promise<{ result: "success" }> {
  try {
    const nc = natsService.getInstance()

    const { wait, recipient, fallbackServer, server, ...wireMeta } = meta ?? {};
    const target = server?.toLowerCase() ?? await resolveTargetServer(recipient, fallbackServer);
    const payload = {
      event: "executeCommand",
      comment: undefined,
      command: `${parent} ${value}`,
      ...wireMeta,
      server: target,
    }

    const js = jetstream(nc);
    const shouldWait = Boolean(wireMeta.commandId) && wait !== false;
    // Register before publishing: the consumer is in this process and may
    // resolve the command before publish() returns.
    const waiter = shouldWait ? waitForCommand(wireMeta.commandId!) : null;

    let pa;

    try {
      pa = await js.publish(
        "order",
        JSON.stringify(payload),
        wireMeta.commandId ? { msgID: `${wireMeta.commandId}:${randomUUID()}` } : undefined,
      );
    } catch (error) {
      if (wireMeta.commandId) {
        resolveCommand(wireMeta.commandId, { ok: false, error: "PUBLISH_FAILED" });
      }

      throw error;
    }

    const stream = pa.stream;
    const seq = pa.seq;
    const duplicate = pa.duplicate;

    if (waiter) {
      const result = await waiter;
      if (!result.ok) throw new Error(result.error);
    }

    return { result: "success" }
  } catch (e) {
    throw e
  }
}