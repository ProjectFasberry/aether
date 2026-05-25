import { env } from "../env";

export const CONTACTS = [
  {
    title: "Telegram",
    value: "tg",
    img: "https://cristalix.gg/content/icons/tg.svg",
    color: "bg-[#007CBD]",
    href: env.VITE_SOCIAL_TG_URL!,
  },
  {
    title: "VK",
    value: "vk",
    img: "https://cristalix.gg/content/icons/vk.svg",
    color: "bg-[#0b5aba]",
    href: env.VITE_SOCIAL_VK_URL!,
  },
  {
    title: "Discord",
    value: "ds",
    img: "https://cristalix.gg/content/icons/discord.svg",
    color: "bg-[#5865F2]",
    href: env.VITE_SOCIAL_DISCORD_URL!,
  }
]