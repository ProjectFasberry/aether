import Elysia from "elysia";
import { cors } from "@elysia/cors";
import { ip } from "elysia-ip";
import { logger } from "@tqman/nice-logger";
import { type ElysiaOpenAPIConfig, fromTypes, openapi } from "@elysia/openapi";

export const corsPlugin = () => new Elysia({ name: "corsPlugin" })
  .use(cors({ credentials: true }));

export const ipPlugin = () => new Elysia({ name: "ipPlugin" })
  .use(ip({ checkHeaders: ["X-Forwarded-For"] }));

export const loggerPlugin = () => new Elysia({ name: "loggerPlugin" })
  .use(logger());

const swaggerConfig: ElysiaOpenAPIConfig = {
	scalar: {
		spec: {
			url: "/openapi/json",
		},
	},
	references: fromTypes("dist/index.d.ts"),
};

export const openApiPlugin = () => new Elysia({ name: "openApiPlugin" })
  .use(openapi(swaggerConfig));

export const hideOpenApiConfig = {
	detail: { hide: true },
};
