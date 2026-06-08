import { env, isProduction } from "../env";
import { client } from "./client";

if (process.env.NODE_ENV !== 'production') {
  if (!env.CRYPTO_PAY_TESTNET_URL || !env.CRYPTO_PAY_TESTNET_TOKEN) {
    console.warn("TESTNET_URL or TESTNET_TOKEN is not defined, but declared")
  }
}

export const cryptoPayClient = client.extend((opts) => ({
  ...opts,
  baseUrl: isProduction
    ? env.CRYPTO_PAY_MAINNET_URL
    : env.CRYPTO_PAY_TESTNET_URL,
  headers: {
    "Crypto-Pay-API-Token": isProduction
      ? env.CRYPTO_PAY_MAINNET_TOKEN
      : env.CRYPTO_PAY_TESTNET_TOKEN,
  }
}))
