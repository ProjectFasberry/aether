import Elysia from "elysia";
import { apiKeys } from "./api-keys";

export const api = new Elysia().group("/api", (app) => app.use(apiKeys));
