import Elysia, { t } from "elysia";
import { getPlayerAvatar, getSkin, getSkinsHistory, setSkin, type SkinsHistoryPayload } from "./skin.model";
import { defineUser } from '#/lib/middlewares/define';
import * as z from 'zod/v4';
import { skinUpload as upload } from './skin-upload.route';
import { withData, withError } from "#/shared/schemas";
import { wrapError } from "@repo/shared/lib/utils";

const head = new Elysia()
  .get("/head/:nickname", async ({ params: { nickname } }) => {
    const data: string = await getPlayerAvatar(nickname)
    return data
  }, {
    response: { 200: t.String() }
  })

const history = new Elysia()
  .get("/history/:nickname", async ({ params: { nickname } }) => {
    const data: SkinsHistoryPayload | null = await getSkinsHistory({ nickname })
    return { data }
  })

const set = new Elysia()
  .use(defineUser())
  .get("/set", async ({ query, nickname, status }) => {
    const result = await setSkin(nickname, query.id)

    if (!result) {
      throw status(500, wrapError("THIRDPARTY_ERROR"))
    }

    return { data: "OK" }
  }, {
    query: z.object({
      id: z.string().min(1)
    }),
    response: {
      200: withData(t.Literal("OK")),
      400: withError,
      500: withError
    }
  })

const full = new Elysia()
  .get('/full/:nickname', async ({ params: { nickname } }) => {
    const data: string = await getSkin(nickname)
    return data
  }, {
    response: { 200: t.String() }
  })

const download = new Elysia()
  .get('/download/:nickname', async ({ set, params: { nickname } }) => {
    const skin = await getSkin(nickname)

    set.headers["content-type"] = 'image/png'
    set.headers['content-disposition'] = `attachment; filename=${nickname}-skin.png`

    return skin
  });

export const skinGroup = new Elysia()
  .group("/skin", app => app
    .use(upload)
    .use(download)
    .use(set)
    .use(history)
    .use(head)
    .use(full)
  )