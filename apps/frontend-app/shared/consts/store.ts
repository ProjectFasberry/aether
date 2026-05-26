import { belkoinImage, charismImage } from "./images";

export const CURRENCIES: Record<string, { img: string, symbol: string }> = {
  "CHARISM": { img: charismImage, symbol: "C" },
  "BELKOIN": { img: belkoinImage, symbol: "B" },
}

export const TARGET_TITLE = {
  "CHARISM": "Харизма",
  "BELKOIN": "Белкоин"
} as const;
