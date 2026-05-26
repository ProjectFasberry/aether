import { getStaticObject } from "@/shared/lib/helpers";
import { action, atom, withAssign } from "@reatom/framework";

export const IDEAS = [
  {
    title: "Геймплей",
    image: getStaticObject("images", "steve-alex.webp"),
    description: "Выживайте, создавайте поселения и города, общайтесь с игроками, создавайте себя",
    type: "full"
  },
  {
    title: "Персонализация",
    image: getStaticObject("images", "wild-west.webp"),
    link: {
      title: "Узнать больше",
      href: "/wiki/profile"
    },
    description: "Создайте себе свой стиль: новые эмоции, частицы и питомцы",
    type: "full"
  },
  {
    title: "Квесты",
    image: getStaticObject("images", "casino-barebones.webp"),
    link: {
      title: "Узнать больше",
      href: "/wiki/quests"
    },
    description: "Квесты - неотъемлемая часть геймплея, если вы хотите быстро заработать",
    type: "full"
  },
  {
    title: "Ресурспак",
    image: getStaticObject("images", "custom-armor.webp"),
    link: {
      title: "Узнать больше",
      href: "/wiki/resourcepack"
    },
    description: "Ресурспак добавляет новые предметы: броню, инструменты, оружие и мебель.",
    type: "module"
  },
  {
    title: "Эмоции",
    image: getStaticObject("images", "emotes-preview.webp"),
    link: {
      title: "Узнать больше",
      href: "/wiki/emotes"
    },
    description: "Сервер поддерживает кастомные движения игрока",
    type: "module"
  }
]

export const selectedKeyAtom = atom(0, "selectedKey").pipe(
  withAssign((atom, name) => ({
    prev: action((ctx) => {
      const target = ctx.get(atom)

      if (target === 0) {
        atom(ctx, IDEAS.length - 1)
      } else {
        atom(ctx, target - 1);
      }
    }, `${name}.prev`),
    next: action((ctx) => {
      const target = ctx.get(atom)

      if (target === IDEAS.length - 1) {
        atom(ctx, 0);
      } else {
        atom(ctx, target + 1);
      }
    }, `${name}.next`)
  }))
)
