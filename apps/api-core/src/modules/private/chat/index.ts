import Elysia from "elysia";
import { chatWs } from "./chat-subscribe.route";
import { chatMessageViews } from "./chat-views.route";
import { chatData } from "./chat-list.route";

export const chat = new Elysia()
  .group("/chat", app => app
    .use(chatData)
    .use(chatWs)
    .use(chatMessageViews)
  )