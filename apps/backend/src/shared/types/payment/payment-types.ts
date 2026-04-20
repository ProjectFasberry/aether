import * as z from "zod/v4";

export const invoiceFiatSchema = z.enum([
  "USD", "EUR", "RUB", "BYN", "UAH", "GBP", "CNY",
  "KZT", "UZS", "GEL", "TRY", "AMD", "THB", "INR",
  "BRL", "IDR", "AZN", "AED", "PLN", "ILS"
])

export const invoiceAssetSchema = z.enum([
  "USDT", "TON", "BTC", "ETH", "LTC", "BNB", "TRX", "USDC"
])

export const invoiceCurrencyTypeSchema = z.enum(["fiat", "crypto"])

export const acceptedAssetsSchema = invoiceAssetSchema

export const exchangeRateSource = z.enum([
  "USDT", "TON", "BTC", "ETH", "LTC", "BNB", "TRX", "USDC"
])

const exchangeRateTarget = invoiceFiatSchema

export type InvoiceType = {
  invoice_id: number,
  hash: string,
  currency_type: z.infer<typeof invoiceCurrencyTypeSchema>,
  asset?: z.infer<typeof invoiceAssetSchema>,
  fiat?: z.infer<typeof invoiceFiatSchema>,
  amount: string,
  paid_asset?: string,
  paid_amount?: string,
  paid_fiat_rate?: string,
  accepted_assets?: z.infer<typeof acceptedAssetsSchema>,
  fee_asset?: string,
  fee_amount?: string,
  fee?: string,
  // deprecated
  pay_url: string,

  bot_invoice_url: string,
  mini_app_invoice_url: string,
  description?: string,
  status: "active" | "paid" | "expired",
  created_at: string,
  paid_usd_rate?: string,
  usd_rate?: string,
  allow_comments: boolean,
  allow_anonymous: boolean
  expiration_date?: string,
  paid_at?: string,
  paid_anonymously: boolean,
  comment: string
  hidden_message?: string,
  payload?: string,
  paid_btn_name?: "viewItem" | "openChannel" | "openBot" | "callback",
  paid_btn_url?: string
}

export type TransferType = {
  transfer_id: number,
  spend_id: string,
  user_id: string,
  asset: z.infer<typeof invoiceAssetSchema>,
  amount: string,
  status: "completed",
  completed_at: string,
  comment?: string
}

export type CheckType = {
  check_id: number,
  hash: string,
  asset: z.infer<typeof invoiceAssetSchema>,
  amount: string,
  bot_check_url: string,
  status: "active" | "activated",
  created_at: string,
  activated_at: string,
}

export type BalanceType = {
  currency_code: z.infer<typeof invoiceAssetSchema>,
  available: string,
  onhold: string
}

export const exchangeRateSchema = z.object({
  is_valid: z.boolean(),
  is_crypto: z.boolean(),
  is_fiat: z.boolean(),
  source: exchangeRateSource,
  target: exchangeRateTarget,
  rate: z.string()
})

export type ExchangeRate = z.infer<typeof exchangeRateSchema>