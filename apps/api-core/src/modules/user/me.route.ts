import Elysia, { t } from "elysia";
import dayjs from 'dayjs';
import { defineOptionalUser } from "#/lib/define";
import { validateBannedStatus } from "#/lib/validators";
import { getPermissions, getMe } from "./me.model";
import { withData } from "#/shared/schemas";
import { skinsModel } from "../server/skin/index.model";

export type MePayload = {
  nickname: string;
  uuid: string;
  meta: {
    login_date: Date;
    reg_date: Date;
    role: {
      id: number;
      name: string;
    };
    permissions: string[];
  };
  avatar: string;
};

export const me = new Elysia()
  .use(validateBannedStatus())
  .use(defineOptionalUser())
  .get("/me", async ({ nickname, status }) => {
    if (!nickname) throw status(404, { data: null })

    const query = await getMe(nickname)
    if (!query) throw status(404, { data: null })

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

    const avatar = await skinsModel.player.getAvatar(base.nickname);

    const data: MePayload = {
      ...base,
      avatar,
      meta
    }

    return { data }
  }, {
    response: {
      200: withData(
        t.Object({
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
          avatar: t.String()
        })
      ),
      404: t.Object({ data: t.Null() })
    }
  })
