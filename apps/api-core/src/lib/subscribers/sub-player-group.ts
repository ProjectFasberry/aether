type LuckpermsUpdateContent = {
  userUuid: string
}

export type LuckpermsLogContent = {
  timestamp: number,
  source: {
    uniqueId: string,
    name: string
  },
  target: {
    type: "USER" | "GROUP",
    uniqueId: string,
    name: string
  },
  description: string
}

type LuckpermsUpdatePayload = {
  id: string,
} & (
    | { type: "userupdate", content: LuckpermsUpdateContent }
    | { type: "log", content: LuckpermsLogContent }
  )

type ActionType = "set" | "unset"