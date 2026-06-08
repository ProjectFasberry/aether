import Elysia, { t } from "elysia";
import {
  changeRoleUsers, restrictUser, editPlayerRole, controlPayloadSchema, userRestrictSchema, userRolesSchema, playersPermissionsSchema,
} from "./users-control.model";
import { validatePermission } from "#/lib/validators";
import { permissions } from "#/shared/constants/permissions";
import { createAdminActivityLog } from "../private.model";
import { nats } from "#/shared/nats/client";
import { SUBJECTS } from "#/shared/nats/subjects";
import { withData } from "#/shared/schemas";
import { buildRouteSummary } from "#/utils";

function publish(event: string, data: { initiator: string, payload: string }) {
  const nc = nats.getInstance()
  nc.publish(SUBJECTS.EVENTS.USERS.CONTROL.WILDCARD, JSON.stringify({ event, data }))
}

const playersControlRestrictCreate = new Elysia()
  .use(validatePermission(permissions.get("PLAYERS.RESTRICT.CREATE")))
  .post("/create", async ({ body: { args, ...rest } }) => {
    const data = await restrictUser({ args, ...rest })
    return { data }
  }, {
    body: t.Composite([
      userRestrictSchema,
      t.Optional(
        t.Object({
          args: t.Object({
            reason: t.Optional(t.String()),
            time: t.Optional(t.String())
          })
        })
      )
    ]),
    response: {
      200: withData(
        controlPayloadSchema
      )
    },
    afterResponse: ({ nickname: initiator, permission, responseValue }) => {
      createAdminActivityLog({ initiator, event: permission })
      publish(permission, { initiator, payload: JSON.stringify(responseValue) })
    },
    detail: {
      summary: buildRouteSummary("Restrict player")
    }
  })

const playersControlRestrictDelete = new Elysia()
  .use(validatePermission(permissions.get("PLAYERS.RESTRICT.DELETE")))
  .delete("/remove", async ({ body: { args, ...rest } }) => {
    const data = await restrictUser({ args, ...rest })
    return { data }
  }, {
    body: t.Composite([
      userRestrictSchema,
      t.Optional(
        t.Object({
          args: t.Object({
            reason: t.Optional(t.String()),
            time: t.Optional(t.String())
          })
        })
      )
    ]),
    afterResponse: ({ nickname: initiator, permission, responseValue }) => {
      createAdminActivityLog({ initiator, event: permission })
      publish(permission, { initiator, payload: JSON.stringify(responseValue) })
    },
    response: {
      200: withData(
        controlPayloadSchema
      )
    },
    detail: {
      summary: buildRouteSummary("Unrestrict player")
    }
  })

const playersControlRestrict = new Elysia()
  .group("/restrict", app => app
    .use(playersControlRestrictCreate)
    .use(playersControlRestrictDelete)
  )

const playersControlRoles = new Elysia()
  .use(validatePermission(permissions.get("PLAYERS.ROLE.UPDATE")))
  .post("/roles", async ({ body: { nicknames, ...base } }) => {
    const data = await changeRoleUsers(nicknames, base)
    return { data }
  }, {
    body: userRolesSchema,
    afterResponse: ({ nickname: initiator, permission, responseValue }) => {
      createAdminActivityLog({ initiator, event: permission })
      publish(permission, { initiator, payload: JSON.stringify(responseValue) })
    },
    response: {
      200: withData(
        controlPayloadSchema
      )
    },
    detail: {
      summary: buildRouteSummary("Change player role")
    }
  })

const playersControlPermissions = new Elysia()
  .use(validatePermission(permissions.get("PLAYERS.PERMISSION.UPDATE")))
  .post("/permission", async ({ body: { nicknames, ...base } }) => {
    const data = await editPlayerRole({ nicknames, ...base })
    return { data }
  }, {
    body: playersPermissionsSchema,
    afterResponse: ({ nickname: initiator, permission, responseValue }) => {
      createAdminActivityLog({ initiator, event: permission })
      publish(permission, { initiator, payload: JSON.stringify(responseValue) })
    },
    response: {
      200: withData(
        t.Object({})
      )
    },
    detail: {
      summary: buildRouteSummary("Change player permission")
    }
  })

export const playersControl = new Elysia()
  .group("", app => app
    .use(playersControlRestrict)
    .use(playersControlRoles)
    .use(playersControlPermissions)
  )
