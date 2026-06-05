import { invariant } from "@repo/shared/lib/utils";
import { createUrls } from "../urls";
import { client as rootClient } from "../../lib/api/root";
import { DB } from "@repo/shared/types/db/general";
import { Kysely } from "kysely";

export const getPanelClient = (generalDb: Kysely<DB>) => {
  const panelUrl = createUrls({ generalDb }).getData().get("panel");
  invariant(panelUrl, "Panel url is not defined");
  return rootClient.extend((opts) => ({ ...opts, baseUrl: `https://${panelUrl}` }));
}
