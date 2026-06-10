import { invariant } from "@repo/shared/lib/utils";
import { createUrlsService } from "../urls";
import { createClient as rootClient } from "../../lib/api/root";
import { DB } from "@repo/shared/types/db/general";
import { Kysely } from "kysely";

export const getPanelClient = ({
  generalDb
}: {
  generalDb: Kysely<DB>
}) => {
  const panelHost = createUrlsService({ generalDb }).getData().get("panel");
  invariant(panelHost, "Panel host is not defined");

  return rootClient().extend((opts) => ({
    ...opts,
    baseUrl: `https://${panelHost}`
  }));
}
