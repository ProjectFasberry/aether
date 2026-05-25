import Elysia from "elysia";
import { cors } from "@elysia/cors";
import { ip } from "elysia-ip";
import { logger } from "@tqman/nice-logger";

export const corsPlugin = () => new Elysia().use(cors({ credentials: true }));
export const ipPlugin = () => new Elysia().use(ip({ checkHeaders: ["X-Forwarded-For"] }));
export const loggerPlugin = () => new Elysia().use(logger());
