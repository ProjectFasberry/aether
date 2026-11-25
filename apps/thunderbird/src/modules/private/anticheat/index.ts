import Elysia from "elysia";
import { grimFlags } from "./grim.route";

export const anticheat = new Elysia()
  .group("/anticheat", (app) => app
    .use(grimFlags)
  );
