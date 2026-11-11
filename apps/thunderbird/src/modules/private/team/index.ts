import Elysia from "elysia";
import { teamList } from "./team-list.route";
import { teamStatus } from "./team-status.route";

export const teamPrivate = new Elysia()
  .group("/team", app => app
    .use(teamList)
    .use(teamStatus)
  );
