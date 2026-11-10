# Internal alerts

Route: `POST /internal/alerts` in `src/modules/service/alerts.route.ts`,
fan-out in `src/shared/notify/alert.ts`.

One authenticated request delivers the same message to Gotify and every
Telegram chat from `tg_logs_chats`. Used by services outside this codebase
(minotaur, wiki), host scripts and CI.

## Auth

An existing API key (`api_keys` table, SHA-256 of the raw key) - the same keys
as the rest of the panel API. No separate token.

## Request

```http
POST /internal/alerts
Authorization: Bearer <api key>
Content-Type: application/json

{
  "from": "minotaur",
  "message": "boot: critical resource \"db\": connection refused",
  "title": "minotaur alert",
  "severity": "critical"
}
```

| field | required | limits |
| --- | --- | --- |
| `from` | yes | 1..64 chars, used in the default title |
| `message` | yes | 1..4096 chars, Gotify body and Telegram text |
| `title` | no | 1..128 chars, default `<from> alert` |
| `severity` | no | `info`, `warning`, `critical`; non-info is prefixed to the text |

Response: `200 { "data": { "delivered": <telegram chats that accepted> } }`;
`401 UNAUTHORIZED` for a missing or unknown key; `422 VALIDATION` for a bad body.

## NATS alternative

In-cluster services publish on `internal.health` instead:

```json
{ "from": "thunderbird", "data": "boot: critical resource \"db\": ...", "timestamp": 0 }
```

`thunderbird` and `glaux` do this themselves: `uncaughtException`,
`unhandledRejection`, and a critical boot failure via the lifecycle
`onCriticalFailure` hook (runs before the rollback closes NATS).

## Notes

- Delivery is best-effort and never throws into the caller; there are no retries.
- Callers should throttle themselves: every request sends one message per chat.
- `thunderbird` and `glaux` cover panic and boot failures; `minotaur` and `wiki`
  need a `POST /internal/alerts` on their fatal boot path (or a NATS publisher).
