import Elysia from "elysia"
import * as z from "zod";
import { type ElysiaOpenAPIConfig, fromTypes, openapi } from "@elysia/openapi"

const swaggerConfig: ElysiaOpenAPIConfig = {
  scalar: {
    spec: {
      url: '/openapi/json'
    }
  },
  references: fromTypes("dist/index.d.ts"),
  mapJsonSchema: {
    zod: z.toJSONSchema
  }
}

export const openApiPlugin = () => new Elysia({ name: "openApiPlugin" }).use(
  openapi(swaggerConfig)
)

export const hideOpenApiConfig = {
  detail: { hide: true }
}