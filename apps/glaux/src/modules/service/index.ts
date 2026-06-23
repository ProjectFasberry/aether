import Elysia, { t } from "elysia";
import { bot } from "../../shared/bot";
import { chats } from "../../shared/bot/chats";
import { traefik } from "./traefik";
import { defineBearer } from "../../lib/define";
import { invariant } from "@repo/shared/lib/utils";

const watchtower = new Elysia()
  .post("/watchtower", async ({ body }) => {
    const { message, title } = body;

    const infraChatId = chats.getData().get("g_infra")
    invariant(infraChatId, "Infra chat id is not defined");

    try {
      await bot.getInstance().api.sendMessage({
        chat_id: infraChatId,
        text: `🛠 *${title}*\n\n\`\`\`\n${message}\n\`\`\``,
        parse_mode: "MarkdownV2",
      });

      return "OK";
    } catch (e) {
      console.error("Sending message error", e);
      return { error: "INTERNAL_SERVER_ERROR" }
    }
  }, {
    parse: "json",
    body: t.Object({
      message: t.String(),
      title: t.String(),
    }),
    response: {
      200: t.Literal("OK"),
      500: t.Object({
        error: t.String(),
      })
    },
    detail: {
      summary: "Webhook for receiving all watchtower alerts"
    }
  });

export const service = new Elysia()
  .use(defineBearer())
  .use(watchtower)
  .use(traefik);
