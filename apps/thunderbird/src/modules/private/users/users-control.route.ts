import Elysia, { t } from "elysia";
import {
  changeRoleUsers, restrictUser, controlPayloadSchema, userRestrictSchema, userRolesSchema,
} from "./users-control.model";
import { validatePermission } from "#/lib/validators";
import { createAdminActivityLog } from "../private.model";
import { natsService } from "#/shared/nats/client";
import { SUBJECTS } from "#/shared/nats/subjects";
import { withData, withError } from "#/shared/schemas";
import { buildRouteSummary } from "#/lib/routes";
import { wrapError } from "@repo/shared/lib/helpers";
import { userControlError } from "./users-control.model";

function publish(event: string, data: { initiator: string, payload: string }) {
  const nc = natsService.getInstance()
  nc.publish(SUBJECTS.EVENTS.USERS.CONTROL.WILDCARD, JSON.stringify({ event, data }))
}

const playersControlRestrictCreate = new Elysia()
  .use(validatePermission("players.restrict.create", { withExternal: true }))
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
      if (!initiator) return
      createAdminActivityLog({ initiator, event: permission })
      publish(permission, { initiator, payload: JSON.stringify(responseValue) })
    },
    detail: {
      summary: buildRouteSummary("Restrict player")
    }
  })

const playersControlRestrictDelete = new Elysia()
  .use(validatePermission("players.restrict.delete", { withExternal: true }))
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
      if (!initiator) return
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
  .use(validatePermission("players.role.update", { withExternal: true }))
  .post("/roles", async ({ body: { nicknames, ...base }, status }) => {
    try {
      const data = await changeRoleUsers(nicknames, base)
      return { data }
    } catch (error) {
      const err = userControlError.reader(error)
      return status(err.code as 400 | 500, wrapError(err.msg))
    }
  }, {
    body: userRolesSchema,
    afterResponse: ({ nickname: initiator, permission, responseValue }) => {
      if (!initiator) return
      createAdminActivityLog({ initiator, event: permission })
      publish(permission, { initiator, payload: JSON.stringify(responseValue) })
    },
    response: {
      200: withData(
        controlPayloadSchema
      ),
      400: withError(t.String()),
      500: withError(t.String()),
    },
    detail: {
      summary: buildRouteSummary("Change player role")
    }
  })

export const playersControl = new Elysia()
  .group("", app => app
    .use(playersControlRestrict)
    .use(playersControlRoles)
  )
