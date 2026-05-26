const DEFAULT_SOFT_DELAY = 300
const DIALOG_DELAY = 300
const ENVIRONMENT = typeof window === 'undefined' ? "server" : "client"

const DONATE_GROUPS = {
  default: "игрок",
  arkhont: "архонт",
  helper: "хелпер",
  loyal: "лоял",
  authentic: "аутентик",
  dev: "разработчик",
  moder: "модератор",
} as const;

const DONATE_COLORS: Record<keyof typeof DONATE_GROUPS, string> = {
  "arkhont": "#30ff5d",
  "authentic": "#e342cd",
  "loyal": "#40c983",
  "default": "#FFFFFF",
  "helper": "#3D3D3D",
  "dev": "#A1A1A1",
  "moder": "#6452d9",
} as const;

const DONATE_TITLE: Record<keyof typeof DONATE_GROUPS, string> = {
  "arkhont": "Архонт",
  "authentic": "Аутентик",
  "loyal": "Лоял",
  "default": "Игрок",
  "helper": "Хелпер",
  "dev": "Разработчик",
  "moder": "Модератор",
} as const;

export {
  DIALOG_DELAY,
  DEFAULT_SOFT_DELAY,
  ENVIRONMENT,
  DONATE_TITLE,
  DONATE_COLORS,
  DONATE_GROUPS
}
