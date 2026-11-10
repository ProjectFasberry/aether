# Build metrics

Module: `src/modules/metrics/build-metrics.route.ts` (tests:
`build-metrics.route.test.ts`), mounted by `src/modules/service/index.ts`.

`POST /metrics/build` accepts
`{ app, stage, branch, commitSha, metrics }` with
`Authorization: Bearer $BUILD_METRICS_TOKEN` and stores a row in the
`build_metrics` database: `client_js_bytes`, `client_css_bytes`,
`client_fonts_bytes`, `client_images_bytes`, `client_other_bytes`,
`server_js_bytes`, `total_bytes`. Atlas CI calls it after the production build;
the table is created on boot.

## Configuration

| variable | purpose |
| --- | --- |
| `BUILD_METRICS_POSTGRES_URI` | `build_metrics` database |
| `BUILD_METRICS_TOKEN` | bearer token expected by the route |

Both live in Infisical under `/glaux`.
