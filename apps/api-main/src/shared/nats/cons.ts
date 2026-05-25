import type { ConsumerInfo } from "@nats-io/jetstream";

export const NATS_CONSUMERS: Record<string, Pick<ConsumerInfo, "name" | "stream_name">[]> = {
	order: [{ stream_name: "events", name: "a" }],
};

export const NATS_JS_STREAMS = [{ name: "events", subjects: ["order"] }];
