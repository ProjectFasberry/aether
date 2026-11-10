# Incident triage

Read the boot log first: every resource logs
`resource started: <name> (<ms>)` or
`resource failed: <name> (critical=<bool>): <message>`, and a fatal boot ends with
`Stopped: critical boot failure` / `boot: Critical resource "<name>" failed: ...`.

## Order of checks

1. `GET /health` - public, 200 or 503 `SHUTTING_DOWN`.
2. `GET /health/ready` - needs an API key (`defineBearer`); 200 with per-database
   health, or 503 `DB_UNAVAILABLE` when a required database is down.
3. Restart loop: compare the boot log across restarts. `pull-update` recreates the
   container only when the image tag digest changes, so repeated restarts with the
   same digest are the app, not the rollout.

## Common signatures

| log | meaning |
| --- | --- |
| `resource failed: db (critical=true)` + `Access denied ... (using password: NO)` | malformed DB URI in Infisical (user or password missing) |
| `Unknown system variable 'max_execution_time'` | MySQL variable sent to MariaDB; the timeout helper must try both names |
| `No command executor for <subject>` | no NATS responder (game server/plugin down); messages are acked as `NO_RESPONDERS`, not an app crash |
| `notify-keyspace-events is "unset"` | QR expiry falls back to WebSocket timers; expected |
| `Stopped: critical boot failure` | a `critical: true` resource did not start; the failing line is above it |

A critical boot failure publishes `internal.health` before the rollback closes
NATS, so it also reaches Gotify and Telegram. Manual alerts:
`POST /internal/alerts` with an API key - see
[glaux internal-alerts](../apps/glaux/agent-docs/internal-alerts.md).

## Non-critical degradation

`jobs`, `minio` and similar `critical: false` resources log a failure and boot
continues. `db` is the exception: every required database must be healthy,
otherwise the process exits on purpose.

## Rollback

The workflow publishes `registry.fasberry.fun/<stage>/thunderbird:latest` and
`:sha-<commit>`. To roll back, pin the previous `sha-` tag on the host; there is no
separate rollback tag. There is no direct host access from a workstation - ask the
operator.

## Logs

Readable by default; `LOG_FORMAT=json` (or `LOG_JSON=true`) switches to structured
lines.
