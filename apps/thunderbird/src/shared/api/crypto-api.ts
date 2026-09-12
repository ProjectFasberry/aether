import { getEnv, isProduction } from "../env";
import { client } from "./client";

if (process.env.NODE_ENV !== 'production') {
  if (!getEnv().CRYPTO_PAY_TESTNET_URL || !getEnv().CRYPTO_PAY_TESTNET_TOKEN) {
    console.warn("TESTNET_URL or TESTNET_TOKEN is not defined, but declared")
  }
}

export const cryptoPayClient = client.extend((opts) => ({
  ...opts,
  baseUrl: isProduction
    ? getEnv().CRYPTO_PAY_MAINNET_URL
    : getEnv().CRYPTO_PAY_TESTNET_URL,
  headers: {
    "Crypto-Pay-API-Token": isProduction
      ? getEnv().CRYPTO_PAY_MAINNET_TOKEN
      : getEnv().CRYPTO_PAY_TESTNET_TOKEN,
  }
}))
