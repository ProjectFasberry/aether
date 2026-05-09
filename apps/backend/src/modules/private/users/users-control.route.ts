import Elysia from "elysia";
import {
  changeRoleUsers,
  controlRestrictUsers,
  editPlayerRole,
  playersControlPermissionsSchema,
  usersControlRestrictSchema,
  usersControlRolesSchema,
} from "./users-control.model";
import { validatePermission } from "#/lib/validators";
import { Permissions } from "#/shared/constants/permissions";
import { createAdminActivityLog } from "../private.model";
import * as z from "zod";
import { nats } from "#/shared/nats/client";
import { SUBJECTS } from "#/shared/nats/subjects";

function publish(event: string, data: { initiator: string, payload: string }) {
  const nc = nats.get()
  nc.publish(SUBJECTS.EVENTS.USERS.CONTROL.WILDCARD, JSON.stringify({ event, data }))
}

const playersControlRestrictCreate = new Elysia()
  .use(validatePermission(Permissions.get("PLAYERS.RESTRICT.CREATE")))
  .post("/create", async ({ body: { args, ...rest } }) => {
    const data = await controlRestrictUsers({ args, ...rest })
    return { data }
  }, {
    body: z.intersection(
      usersControlRestrictSchema,
      z.object({
        args: z.object({
          reason: z.string().optional(),
          time: z.string().optional()
        }).optional()
      })
    ),
    afterResponse: ({ nickname: initiator, permission, responseValue }) => {
      createAdminActivityLog({ initiator, event: permission })
      publish(permission, { initiator, payload: JSON.stringify(responseValue) })
    }
  })

const playersControlRestrictDelete = new Elysia()
  .use(validatePermission(Permissions.get("PLAYERS.RESTRICT.DELETE")))
  .delete("/remove", async ({ body: { args, ...rest } }) => {
    const data = await controlRestrictUsers({ args, ...rest })
    return { data }
  }, {
    body: z.intersection(
      usersControlRestrictSchema,
      z.object({
        args: z.object({
          reason: z.string().optional(),
          time: z.string().optional()
        }).optional()
      })
    ),
    afterResponse: ({ nickname: initiator, permission, responseValue }) => {
      createAdminActivityLog({ initiator, event: permission })
      publish(permission, { initiator, payload: JSON.stringify(responseValue) })
    }
  })

const playersControlRestrict = new Elysia()
  .group("/restrict", app => app
    .use(playersControlRestrictCreate)
    .use(playersControlRestrictDelete)
  )

const playersControlRoles = new Elysia()
  .use(validatePermission(Permissions.get("PLAYERS.ROLE.UPDATE")))
  .post("/roles", async ({ body: { nicknames, ...base } }) => {
    const data = await changeRoleUsers(nicknames, base)
    return { data }
  }, {
    body: usersControlRolesSchema,
    afterResponse: ({ nickname: initiator, permission, responseValue }) => {
      createAdminActivityLog({ initiator, event: permission })
      publish(permission, { initiator, payload: JSON.stringify(responseValue) })
    }
  })

const playersControlPermissions = new Elysia()
  .use(validatePermission(Permissions.get("PLAYERS.PERMISSION.UPDATE")))
  .post("/permission", async ({ body: { nicknames, ...base } }) => {
    const data = await editPlayerRole(nicknames, base)
    return { data }
  }, {
    body: playersControlPermissionsSchema,
    afterResponse: ({ nickname: initiator, permission, responseValue }) => {
      createAdminActivityLog({ initiator, event: permission })
      publish(permission, { initiator, payload: JSON.stringify(responseValue) })
    }
  })

export const playersControl = new Elysia()
  .group("", app => app
    .use(playersControlRestrict)
    .use(playersControlRoles)
    .use(playersControlPermissions)
  )