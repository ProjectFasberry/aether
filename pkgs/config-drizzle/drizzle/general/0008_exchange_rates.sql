-- Exchange rates (MN-153).
--
-- RUB is the base: the admin sets how many rubles one BELKOIN costs, and every
-- other currency is derived through BELKOIN. A pair can be entered directly in
-- either direction; the service inverts and pivots as needed.
--
-- One row per pair and effective moment; history is append-only.

CREATE UNIQUE INDEX IF NOT EXISTS "exchange_rates_pair_effective_uq"
  ON "exchange_rates" ("from_currency", "to_currency", "effective_from");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'exchange_rates_distinct_currencies'
  ) THEN
    ALTER TABLE "exchange_rates"
      ADD CONSTRAINT "exchange_rates_distinct_currencies"
      CHECK ("from_currency" <> "to_currency");
  END IF;
END $$;
