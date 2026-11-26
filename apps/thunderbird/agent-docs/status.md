# Server status

Files: `src/modules/server/status` (route and wiring),
`pkgs/core/src/modules/status` (collection and Redis snapshot), cron job
`update-server-status`, table `servers`, keys `panel` in `ip_list`.

`GET /server/status` does not query the proxy: it reads one Redis snapshot, so
launcher and site requests stay cheap and identical.

## Snapshot

The cron job `update-server-status` runs on boot and every minute (UTC). Each
run:

1. reads the proxy panel (`https://<panel>/health|count|servers|playerlist` with
   the `PANEL_USER`/`PANEL_PASSWORD` basic auth from the env);
2. pings every catalog backend over NATS (`server.<origin>.ping`, 1 s);
3. maps the result to the public payload and stores it in
   `internal:server-status:data`.

A non-`ok` panel health keeps the previous snapshot instead of publishing an
empty server list; the snapshot then carries an older `updatedAt`.

## Online rules

- The proxy lists every configured server, including stopped ones, so its
  `/servers` map is only a registration check.
- `status: online` means: registered in the proxy **and** the backend answered
  the NATS ping. Players still connected count as online while a ping is
  missing.
- Without a NATS connection liveness cannot be checked and the proxy view wins
  (`isServerAlive` returns `null`).
- `available` is `online && servers.available`, so the panel can hide a running
  backend but cannot make a stopped one look available.

Consequence: every catalog backend must run `NatsIntegration` with
`serverId == origin`, otherwise it shows as offline when empty and online only
while it has players.

## Payload

```json
{
  "updatedAt": "2026-11-26T19:30:00.000Z",
  "proxy": { "status": "online", "online": 0, "max": 200, "players": [] },
  "servers": {
    "bisquite": {
      "status": "online",
      "available": true,
      "online": 0,
      "max": 200,
      "players": [],
      "runtime": { "minecraft": "1.20.1", "loader": "fabric", "javaMajor": 17 },
      "content": { "pack": null }
    }
  }
}
```

`updatedAt` is absent in snapshots written before it was added, so consumers
must treat it as optional.
