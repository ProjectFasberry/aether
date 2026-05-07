import * as z from "zod";

export const currencyCryptoSchema = z.enum(["USDT", "TON", "BTC", "ETH", "LTC", "BNB", "TRX", "USDC"]);
export const currencyFiatSchema = z.enum(["RUB"]);
