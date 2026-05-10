const DEFAULT_SOFT_DELAY = 300
const DIALOG_DELAY = 300
const ENVIRONMENT = typeof window === 'undefined' ? "server" : "client"

let LOG_SNAPSHOTS = true

export {
  DIALOG_DELAY,
  DEFAULT_SOFT_DELAY,
  ENVIRONMENT,
  LOG_SNAPSHOTS
}