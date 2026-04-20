import Elysia from "elysia";
import { ip } from "elysia-ip";
export const ipPlugin = () => new Elysia().use(ip({ checkHeaders: ["X-Forwarded-For"] }));
