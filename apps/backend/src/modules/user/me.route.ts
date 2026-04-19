import Elysia, { t } from "elysia";
import dayjs from 'dayjs';
import { defineOptionalUser } from "#/lib/middlewares/define";
import type { MePayload } from "@repo/shared/types/entities/user"
import { validateBannedStatus } from "#/lib/middlewares/validators";
import { getPermissions, getMe } from "./me.model";

export const me = new Elysia()
  .use(validateBannedStatus())
  .use(defineOptionalUser())
  .model({
    me: t.Object({
      data: t.Object({
        nickname: t.String(),
        uuid: t.String(),
        meta: t.Object({
          login_date: t.Date(),
          reg_date: t.Date(),
          role: t.Object({
            id: t.Number(),
            name: t.String()
          }),
          permissions: t.Array(t.String())
        }),
      })
    })
  })
  .get("/me", async ({ nickname, status }) => {
    if (!nickname) {
      return status(404, { data: null })
    }

    const query = await getMe(nickname)

    if (!query) {
      return status(404, { data: null })
    }

    const { reg_date, login_date, role_id, role_name, ...base } = query;

    const permissions = await getPermissions(nickname, role_id);

    const loginDate = dayjs(Number(query.login_date)).toDate();
    const regDate = dayjs(Number(query.reg_date)).toDate()

    const meta: MePayload["meta"] = {
      login_date: loginDate,
      reg_date: regDate,
      role: {
        id: role_id,
        name: role_name
      },
      permissions
    }

    const data: MePayload = {
      ...base,
      meta
    }

    return { data }
  }, {
    response: {
      200: "me",
      404: t.Object({ data: t.Null() })
    }
  })