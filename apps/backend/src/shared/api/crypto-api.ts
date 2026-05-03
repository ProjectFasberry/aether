import { isProduction } from "../env";
import { client } from "./client";

export const CRYPTO_PAY_API = client.extend((opts) => ({
  ...opts,
  baseUrl: isProduction ? Bun.env.CRYPTO_PAY_MAINNET_URL : Bun.env.CRYPTO_PAY_TESTNET_URL,
  headers: {
    "Crypto-Pay-API-Token": isProduction ? Bun.env.CRYPTO_PAY_MAINNET_TOKEN : Bun.env.CRYPTO_PAY_TESTNET_TOKEN,
  }
}))