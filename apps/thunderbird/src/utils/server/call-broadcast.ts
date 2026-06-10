import { type AbortableCommandArgs, callServerCommand } from "./call-command";

type CallBroadcast = { message: string }

export async function callBroadcast(
  { message }: CallBroadcast,
) {
  const payload = { parent: "cmi", value: `broadcast ${message}` } as const;

  return callServerCommand(payload)
}