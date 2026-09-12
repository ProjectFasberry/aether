import Elysia from "elysia";
import { defineRequiredUser } from "#/lib/define";
import { nats } from "#/shared/nats/client";
import { logger } from "@repo/shared/utils/logger";
import type { Subscription } from "@nats-io/nats-core";
import {
  chatCreateMessageSchema,
  chatDeleteMessageSchema,
  chatEditMessageSchema,
  type ChatEvent,
  type ChatEventVariant,
  type ChatItem,
  chat,
} from "./chat.model";
import { buildRouteSummary } from "#/utils";

type ExecEvent = {
  data: unknown;
  nickname: string;
  publish: (chat: ChatEventVariant, val: unknown) => void;
};

async function createEvent({ data, nickname, publish }: ExecEvent) {
  const body = chatCreateMessageSchema.parse(data);
  const created = await chat.createMsg(nickname, body.message);
  publish("create", created);
}

async function deleteEvent({ data, nickname, publish }: ExecEvent) {
  const body = chatDeleteMessageSchema.parse(data);
  await chat.deleteMsg(nickname, body.id);
  publish("delete", { id: body.id });
}

async function editEvent({ data, nickname, publish }: ExecEvent) {
  const body = chatEditMessageSchema.parse(data);
  const edited = await chat.editMsg(nickname, body.id, body.message);
  publish("edit", edited);
}

const EVENTS: Record<string, (pd: ExecEvent) => Promise<void>> = {
  create: createEvent,
  edit: editEvent,
  delete: deleteEvent,
};

const timers = new Map<string, ReturnType<typeof setInterval>>();
const subs = new Map<string, Subscription>();

export const chatWs = new Elysia()
  .use(defineRequiredUser())
  .ws("/subscribe", {
    async open(ws) {
      const { nickname } = ws.data;
      if (!nickname) return ws.close(1008, "Unauthorized");

      const nc = nats.getInstance();

      try {
        const sub = nc.subscribe(`privated.chat.*`, {
          callback: (err, msg) => {
            if (err) {
              logger.error("NATS callback error:", err);
              return;
            }

            const parts = msg.subject.split(".");
            const event = parts[2] as ChatEventVariant;
            if (!event) return;

            try {
              const data = msg.json<ChatItem>();
              const payload = { event, data };
              ws.send(payload);
            } catch (e) {
              logger.error("Failed to handle NATS message:", e);
            }
          },
        });

        subs.set(ws.id, sub);
        (ws.data as { nickname: string }).nickname = nickname;
      } catch (e) {
        logger.error("Failed to subscribe to NATS:", e);
        ws.close(1011, "Subscription error");
      }
    },
    async message(ws, raw) {
      if (!raw) return;

      const { nickname } = ws.data;
      const { event, data } = raw as ChatEvent<unknown>;

      const nc = nats.getInstance();
      const publish = (t: ChatEventVariant, v: unknown) => {
        nc.publish(`privated.chat.${t}`, JSON.stringify(v));
      };

      try {
        const exec = EVENTS[event];
        if (!exec) {
          console.warn(`Event '${event}' is not executed`);
          return;
        }

        await exec({ nickname, data, publish });
      } catch (e) {
        logger.error("Message handling failed:", e);
      }
    },
    async close(ws, code, reason) {
      const sub = subs.get(ws.id);

      if (sub) {
        sub.unsubscribe();
        subs.delete(ws.id);
      }

      console.log(`Client closed. Code: ${code}; Reason: ${reason}`);
    },
    detail: {
      summary: buildRouteSummary("Subscribe to chat events"),
    },
  });
