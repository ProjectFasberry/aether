import { startOrderConsumer } from "#/utils/server/call-command";
import type { ConsumerUpdateConfig } from "@nats-io/jetstream";

type ConsumerSpec = ConsumerUpdateConfig & {
  stream_name: string;
  name: string;
};

export const ORDER_MAX_DELIVER = 10;
export const ORDER_ACK_WAIT_NS = 30 * 1_000_000_000; // 30s

export const NATS_CONSUMERS: Record<string, ConsumerSpec[]> = {
  order: [
    {
      stream_name: "events",
      name: "a",
      max_deliver: ORDER_MAX_DELIVER,
      ack_wait: ORDER_ACK_WAIT_NS,
      max_ack_pending: 100,
      filter_subject: "order",
    }
  ],
};

export const NATS_JS_STREAMS = [
  { name: "events", subjects: ["order"] },
  // Terminal command messages are stored here for inspection instead of being
  // redelivered forever.
  { name: "dlq", subjects: ["order.dlq"] },
];

export const NATS_CONSUMERS_CB = [
  { name: "startOrder", cb: () => startOrderConsumer() },
]
