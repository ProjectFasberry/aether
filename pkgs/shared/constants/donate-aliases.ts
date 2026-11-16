export const DONATE_GROUPS = {
  default: "игрок",
  arkhont: "архонт",
  helper: "хелпер",
  loyal: "лоял",
  authentic: "аутентик",
  dev: "разработчик",
  moder: "модератор",
  testers: "тестер",
} as const;

export const DONATE_COLORS: Record<keyof typeof DONATE_GROUPS, string> = {
  "arkhont": "#30ff5d",
  "authentic": "#e342cd",
  "loyal": "#40c983",
  "default": "#FFFFFF",
  "helper": "#3D3D3D",
  "dev": "#A1A1A1",
  "moder": "#6452d9",
  "testers": "#3b82f6",
} as const;

export const DONATE_TITLE: Record<keyof typeof DONATE_GROUPS, string> = {
  "arkhont": "Архонт",
  "authentic": "Аутентик",
  "loyal": "Лоял",
  "default": "Игрок",
  "helper": "Хелпер",
  "dev": "Разработчик",
  "moder": "Модератор",
  "testers": "Тестер",
} as const;