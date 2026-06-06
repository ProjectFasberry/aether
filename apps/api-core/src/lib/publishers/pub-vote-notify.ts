import { nats } from "#/shared/nats/client"

export function publishVoteNotify(nickname: string) {
  const nc = nats.getInstance()

  const payload = JSON.stringify({
    type: "vote",
    payload: { nickname }
  })

  // todo: replace to real subject
  return nc.publish("test", payload)
}
