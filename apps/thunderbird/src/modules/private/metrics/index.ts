import Elysia from "elysia";
import { playersMetrics } from "./players.route";
import { playersStream } from "./players-stream.route";

export const metrics = new Elysia()
  .group("/metrics", app => app
    .use(playersMetrics)
    .use(playersStream)
  );
