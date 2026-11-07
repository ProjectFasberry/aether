import { natsService } from "#/shared/nats/client";

type CallBroadcast = { message: string }

/**
 * Network-wide chat broadcast. The NatsBridge `general` scope subscribes to
 * `general.server.announce` and announces the message locally on every server,
 * so this does not need a command executor or a reply.
 */
export async function callBroadcast(
  { message }: CallBroadcast,
): Promise<{ result: "success" }> {
  const nc = natsService.getInstance();
  nc.publish("general.server.announce", new TextEncoder().encode(message));

  return { result: "success" };
}
