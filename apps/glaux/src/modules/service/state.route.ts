import Elysia, { t } from "elysia";
import { requireApiKey } from "../../lib/guards/bearer";
import { getServiceState, tryUpdateState } from "../../shared/state";
import { persistServiceState } from "../../shared/services/service-state";
import { withData, withError } from "../../helpers";

export const stateRoute = new Elysia()
  .use(requireApiKey())
  .get("/service/state", () => ({ data: getServiceState() }), {
    response: {
      200: withData(t.Object({
        logging: t.Object({
          validators: t.Boolean(),
          globalError: t.Boolean(),
          services: t.Boolean(),
          requests: t.Boolean(),
          outboundRequests: t.Boolean(),
        }),
      })),
      500: withError(),
    },
    detail: { summary: "Get logging state" },
  })
  .post("/service/state/:key", async ({ params: { key }, body, status }) => {
    if (!tryUpdateState(`logging.${key}`, body.value)) {
      return status(404, { error: "UNKNOWN_STATE_KEY" });
    }

    await persistServiceState();
    return { data: getServiceState() };
  }, {
    body: t.Object({ value: t.Boolean() }),
    response: {
      200: withData(t.Object({
        logging: t.Object({
          validators: t.Boolean(),
          globalError: t.Boolean(),
          services: t.Boolean(),
          requests: t.Boolean(),
          outboundRequests: t.Boolean(),
        }),
      })),
      404: withError(t.UnionEnum(["UNKNOWN_STATE_KEY"])),
      500: withError(),
    },
    detail: { summary: "Update a logging state flag" },
  });
