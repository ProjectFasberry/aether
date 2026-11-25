import Elysia from "elysia";
import { grimFlags } from "./grim.route";
import { grimActions } from "./grim-actions.route";

export const anticheat = new Elysia()
  .group("/anticheat", (app) => app
    .use(grimFlags)
    .use(grimActions)
  );
