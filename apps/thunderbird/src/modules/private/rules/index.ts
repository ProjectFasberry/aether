import Elysia from "elysia";
import { rulesList } from "./rules-list.route";
import { rulesUpdate } from "./rules-update.route";

export const rules = new Elysia()
  .group("/rules", (app) => app
    .use(rulesList)
    .use(rulesUpdate)
  );
