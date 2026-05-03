import * as z from "zod/v4";

export const currencyCryptoSchema = z.enum(["USDT", "TON", "BTC", "ETH", "LTC", "BNB", "TRX", "USDC"]);
export const currencyFiatSchema = z.enum(["RUB"]);
