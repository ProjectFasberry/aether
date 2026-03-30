import { logger } from "@bogeychan/elysia-logger";
import Elysia from "elysia";

export const loggerPlugin = () => new Elysia().use(logger());
