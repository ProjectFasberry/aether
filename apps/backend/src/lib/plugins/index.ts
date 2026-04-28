import cors from "@elysiajs/cors";
import Elysia from "elysia";
import { logger } from "@tqman/nice-logger";
import { ip } from "elysia-ip"

export const corsPlugin = () => new Elysia().use(
  cors({
    credentials: true
  })
)

export const loggerPlugin = () => logger()

export const ipPlugin = () => new Elysia().use(
  ip({ checkHeaders: ["X-Forwarded-For"] })
)