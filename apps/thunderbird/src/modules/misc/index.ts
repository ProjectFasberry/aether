import { getStaticUrl } from "#/helpers/volume";
import { urlsService } from "#/shared/services/urls";
import { S3 } from "#/shared/minio/client";
import { withData, withError } from "#/shared/schemas";
import { wrapError } from "#/utils";
import Elysia, { redirect, t } from "elysia";

const MISC_FILES: Partial<Record<string, { variant: "static" | "redirect"; content: string }>> = {
  terms: { variant: "static", content: "info_terms_page.pdf" },
  privacy: { variant: "static", content: "info_privacy_page.pdf" },
  contacts: { variant: "static", content: "info_contacts_page.pdf" },
  telegram: { variant: "redirect", content: "https://t.me/fasberry" },
  discord: { variant: "redirect", content: "https://discord.gg/fasberry" },
  vk: { variant: "redirect", content: "https://vk.com/fasberry" },
};

const getApiMiscRoute = (path: string) => {
  const host = urlsService.getData().get("api-main-host");
  return `https://${host}/misc/${path}`;
};

const SOCIALS = [
  {
    title: "Telegram",
    value: "tg",
    img: "https://cristalix.gg/content/icons/tg.svg",
    color: "#007CBD",
    href: getApiMiscRoute("telegram"),
  },
  {
    title: "VK",
    value: "vk",
    img: "https://cristalix.gg/content/icons/vk.svg",
    color: "#0b5aba",
    href: getApiMiscRoute("vk"),
  },
  {
    title: "Discord",
    value: "ds",
    img: "https://cristalix.gg/content/icons/discord.svg",
    color: "#5865F2",
    href: getApiMiscRoute("discord"),
  },
];

const belkoinImage = getStaticUrl("minecraft/items/belkoin_wallet.png");
const charismImage = getStaticUrl("minecraft/items/charism_wallet.png");

const CURRENCIES: Record<string, { img: string; symbol: string }> = {
  CHARISM: { img: charismImage, symbol: "C" },
  BELKOIN: { img: belkoinImage, symbol: "B" },
};

export const misc = new Elysia()
  .group("/misc", (app) => app
    .get("/currencies", async () => {
      return { data: CURRENCIES };
    }, {
      response: {
        200: withData(
          t.Record(
            t.String({ description: "Uppercased value" }),
            t.Object({ img: t.String(), symbol: t.String() }),
          ),
        ),
      },
    })
    .get("/socials", async () => {
      return { data: SOCIALS };
    }, {
      response: {
        200: withData(
          t.Array(
            t.Object({
              title: t.String(),
              value: t.String(),
              img: t.String(),
              color: t.String(),
              href: t.String(),
            }),
          ),
        ),
      },
    })
    .get("/:id", async ({ params: { id }, status, set }) => {
      const target = MISC_FILES[id];
      if (!target) {
        throw status(404, wrapError("NOT_FOUND"));
      }

      if (target.variant === "redirect") {
        return redirect(target.content);
      }

      if (target.variant === "static") {
        const data = await S3.getClient("static").file(`misc/${target.content}`).arrayBuffer();

        set.headers["Content-Type"] = "application/pdf";

        return data;
      }

      throw status(404, wrapError("NOT_FOUND"));
    }, {
      response: {
        404: withError(t.UnionEnum(["NOT_FOUND"])),
      },
    })
  );
