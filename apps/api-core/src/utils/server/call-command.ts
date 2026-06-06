import { nats } from "#/shared/nats/client"
import { NATS_CONSUMERS } from "#/shared/nats/cons";
import { SUBJECTS } from "#/shared/nats/subjects";
import { jetstream } from "@nats-io/jetstream";
import { safeJsonParse } from "@repo/shared/lib/utils";

type CommandType =
  | "lp" // luckperms
  | "sudo" // cmi sudo
  | "cmi" // cmi
  | "p" // player points

type CallServerCommand = {
  parent: CommandType,
  value: string
}

type ResponseMsg = {
  result: "ok"
} | {
  error: string
}

export type AbortableCommandArgs = {
  signal: AbortSignal
}

const timeout = 2000

export const startOrderConsumer = async (): Promise<void> => {
  const nc = nats.getInstance()
  const js = jetstream(nc);

  const orderCons = NATS_CONSUMERS["order"][0]
  const consumer = await js.consumers.get(orderCons.stream_name, orderCons.name);

  const msgs = await consumer.consume({ max_messages: 1, expires: 1000 });

  (async () => {
    try {
      for await (const s of msgs.status()) {
        if (s.type === "heartbeats_missed") {
          console.log(`${s.count} heartbeats missed`);
          if (s.count === 2) {
            msgs.stop();
          }
        }
      }
    } catch (err) {
      console.error("Status monitor error:", err);
    }
  })();

  try {
    for await (const m of msgs) {
      try {
        const payload = m.data;
        console.log(new TextDecoder().decode(payload), m.seq, m.subject);

        const r = await nc.request(SUBJECTS.SERVER.EVENTS.USER.EVENT, payload, { timeout });
        const res = r.json<ResponseMsg>();

        if ("error" in res) {
          m.nak();
          console.error("Business error from request:", res.error);
          continue;
        }

        m.ack();
      } catch (e) {
        console.error("Failed to process message:", e);
        m.nak();
      }
    }
  } catch (e) {
    console.error("Consumer loop stopped due to critical error:", e);
  }
}

export async function callServerCommand(
  { parent, value }: CallServerCommand,
): Promise<{ result: "success" }> {
  try {
    const nc = nats.getInstance()

    const payload = {
      event: "executeCommand",
      comment: undefined,
      command: `${parent} ${value}`
    }

    const js = jetstream(nc);

    const pa = await js.publish("event.b", JSON.stringify(payload))

    const stream = pa.stream;
    const seq = pa.seq;
    const duplicate = pa.duplicate;

    console.log("pa", stream, seq, duplicate)

    return { result: "success" }
  } catch (e) {
    throw e
  }
}


type SendEmailInServer = {
  server: string,
  msg: string
  nickname: string
} & (| {
  temp?: false,
  time?: never
} | {
  temp: true,
  time: string
})

async function sendEmailInServer({ nickname, msg, server, temp, time }: SendEmailInServer) {
  if (server !== 'bisquite') {
    throw new Error('unsupported server')
  }

  const nc = nats.getInstance()
  const decoder = new TextDecoder();

  let command = `send ${nickname} ${msg}`

  if (temp) {
    command = `sendtemp ${nickname} ${time} ${msg}`
  }

  const payload = {
    event: "executeCommand",
    command: `cmi mail ${command}`
  }

  const callCmdResult = await nc.request("event", JSON.stringify(payload))
  const callCmdResultData = safeJsonParse<{ result: "ok" }>(decoder.decode(callCmdResult.data))

  if (!callCmdResultData.ok) {
    throw callCmdResultData.error
  }
}
