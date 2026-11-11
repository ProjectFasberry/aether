import Elysia from "elysia";
import { type Subscription } from "@nats-io/nats-core";
import { subscribeGeneralPlayerJoin, subscribeGeneralPlayerQuit } from "@projectfasberry/events";
import { validatePermission } from "#/lib/validators";
import { natsService } from "#/shared/nats/client";
import { buildRouteSummary } from "#/lib/routes";

const HEARTBEAT_MS = 25_000;

type PresenceEvent = {
	date: string;
	name: string;
	server: string;
};

/**
 * Server-sent presence feed for the panel: one `data:` line per join/quit, so
 * the metrics page can move its online counters without polling the database.
 */
export const playersStream = new Elysia()
	.use(validatePermission("metrics.read", { withExternal: true }))
	.get("/players/stream", ({ request }) => {
		const nc = natsService.getInstance();
		const encoder = new TextEncoder();
		const subscriptions: Subscription[] = [];

		let heartbeat: ReturnType<typeof setInterval> | undefined;
		let controllerRef: ReadableStreamDefaultController<Uint8Array> | null = null;
		let closed = false;

		const cleanup = () => {
			if (closed) return;
			closed = true;

			if (heartbeat) clearInterval(heartbeat);
			for (const subscription of subscriptions) subscription.unsubscribe();

			request.signal.removeEventListener("abort", cleanup);

			try {
				controllerRef?.close();
			} catch {
				// Already closed by the client: nothing to flush.
			}
		};

		const stream = new ReadableStream<Uint8Array>({
			start(controller) {
				controllerRef = controller;

				const send = (chunk: string) => {
					if (closed) return;
					controller.enqueue(encoder.encode(chunk));
				};

				const sendEvent = (type: "join" | "quit", presence: PresenceEvent) =>
					send(`data: ${JSON.stringify({ type, ...presence })}\n\n`);

				send("retry: 5000\n\n");

				subscriptions.push(
					subscribeGeneralPlayerJoin(nc, (payload, error) => {
						if (error || !payload) return;
						sendEvent("join", payload.json() as PresenceEvent);
					}),
					subscribeGeneralPlayerQuit(nc, (payload, error) => {
						if (error || !payload) return;
						sendEvent("quit", payload.json() as PresenceEvent);
					}),
				);

				heartbeat = setInterval(() => send(": ping\n\n"), HEARTBEAT_MS);

				request.signal.addEventListener("abort", cleanup, { once: true });
			},
			cancel() {
				cleanup();
			},
		});

		return new Response(stream, {
			headers: {
				"content-type": "text/event-stream",
				"cache-control": "no-cache, no-transform",
				connection: "keep-alive",
				"x-accel-buffering": "no",
			},
		});
	}, {
		detail: {
			summary: buildRouteSummary("Stream player presence events"),
		},
	});
