import { nats } from "#/shared/nats/client"
import { NATS_CONSUMERS } from "#/shared/nats/cons";
import { SUBJECTS } from "#/shared/nats/subjects";
import { jetstream } from "@nats-io/jetstream";
import { safeJsonParse } from "../config/transforms";

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
  const nc = nats.get()
  const js = jetstream(nc);

  const orderCons = NATS_CONSUMERS["order"][0]
  const с = await js.consumers.get(orderCons.stream_name, orderCons.name);

  while (true) {
    try {
      const msgs = await с.consume({ max_messages: 1, expires: 1000 });

      (async () => {
        for await (const s of await msgs.status()) {
          switch (s.type) {
            case "heartbeats_missed":
              console.log(`${s.count} heartbeats missed`);

              if (s.count === 2) {
                msgs.stop();
              }
          }
        }
      })();

      for await (const m of msgs) {
        const payload = m.data;

        console.log(new TextDecoder().decode(payload), m.seq, m.subject);

        const r = await nc.request(SUBJECTS.SERVER.EVENTS.USER.EVENT, payload, { timeout })
        const res = r.json<ResponseMsg>();

        if ("error" in res) {
          m.nak()
          throw new Error(res.error);
        }

        m.ack();
      }
    } catch (e) {
      console.error(e);
    }
  }
}

export async function callServerCommand(
  { parent, value }: CallServerCommand,
): Promise<{ result: "success" }> {
  try {
    const nc = nats.get()

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

  const nc = nats.get()
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