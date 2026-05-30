import * as z from "zod";

export const currencyCryptoSchema = z.enum(["USDT", "TON", "BTC", "ETH", "LTC", "BNB", "TRX", "USDC"]);

export const PAYMENT_CURRENCIES_MAPPING: Record<z.infer<typeof currencyCryptoSchema>, string> = {
	BTC: "bitcoin",
	ETH: "ethereum",
	USDT: "tether",
	TON: "the-open-network",
	TRX: "tron",
	USDC: "usd-coin",
	BNB: "binancecoin",
	LTC: "litecoin",
};
