import Elysia from "elysia";
import { cors } from "@elysia/cors";
import { logger } from "@tqman/nice-logger";
import { ip } from "elysia-ip"

export const corsPlugin = () => new Elysia().use(
  cors({
    credentials: true
  })
)

export const loggerPlugin = () => logger()

export const ipPlugin = () => new Elysia({ name: "ipPlugin" }).use(
  ip({ checkHeaders: ["X-Forwarded-For"] })
)