import type { ExchangeRate } from "#/shared/types/payment/payment-types"
import type { GameCurrency, StoreExchangeRatesPayload } from "@repo/shared/schemas/payment"

export async function getExchangeRatesStore(
  storeRates: { type: string, value: string }[],
  realExchangeRates: ExchangeRate[]
): Promise<StoreExchangeRatesPayload> {
  const TARGETS = ["RUB", "UAH", "KZT"] as const
  type TargetFiat = typeof TARGETS[number]

  function isTargetFiat(v: string): v is TargetFiat {
    return (TARGETS as readonly string[]).includes(v)
  }

  const rateMap: Partial<Record<TargetFiat, number>> = {}

  for (const r of realExchangeRates) {
    if (r.source === "USDT" && isTargetFiat(r.target)) {
      const parsedRate = Number(r.rate)
      if (!Number.isFinite(parsedRate)) continue
      rateMap[r.target] = parsedRate
    }
  }

  for (const t of TARGETS) {
    if (!rateMap[t]) {
      throw new Error("Incorrect target")
    }
  }

  const result = storeRates.reduce((acc, item) => {
    const key = item.type as GameCurrency

    const valueNum = Number(item.value)

    if (!Number.isFinite(valueNum)) {
      throw new Error("Incorrect number of store economy key")
    }

    const rubPerUsdt = rateMap.RUB as number
    const uahPerUsdt = rateMap.UAH as number
    const kztPerUsdt = rateMap.KZT as number

    const per = {
      USDT: valueNum / rubPerUsdt,
      RUB: valueNum,
      UAH: valueNum * (uahPerUsdt / rubPerUsdt),
      KZT: valueNum * (kztPerUsdt / rubPerUsdt),
    }

    acc[key] = per
    return acc
  }, {} as StoreExchangeRatesPayload)

  return result
}
