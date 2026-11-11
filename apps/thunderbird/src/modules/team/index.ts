import Elysia from "elysia";
import { teamApply } from "./team-apply.route";

export const team = new Elysia()
  .group("/team", app => app
    .use(teamApply)
  );
